import type { TracklistItem, PriceSuggestion } from '../db/types';
import type { ReleaseMetadata } from '../db/operations';

export interface DiscogsCredentials {
  consumerKey: string;
  consumerSecret: string;
}

const BASE_URL = 'https://discogs.my-collection.mobulum.com';
const MIN_REQUEST_DELAY_MS = 1100;
const MAX_RETRIES = 5;
const DEFAULT_RETRY_WAIT_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const RATE_LIMIT_LOW_THRESHOLD = 5;
const RATE_LIMIT_SLOW_DELAY_MS = 3000;

export interface DiscogsReleaseResponse {
  id: number;
  title: string;
  year: number;
  country: string;
  genres: string[];
  styles: string[];
  tracklist: Array<{
    position: string;
    title: string;
    duration: string;
    type_: string;
  }>;
  images?: Array<{
    type: string;
    uri: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  lowest_price: number | null;
  num_for_sale: number;
  community: {
    have: number;
    want: number;
    rating: {
      count: number;
      average: number;
    };
  };
  uri: string;
}

export interface DiscogsPriceSuggestionsResponse {
  [condition: string]: {
    currency: string;
    value: number;
  };
}

export class DiscogsApiError extends Error {
  status: number;
  releaseId: number;

  constructor(message: string, status: number, releaseId: number) {
    super(message);
    this.name = 'DiscogsApiError';
    this.status = status;
    this.releaseId = releaseId;
  }
}

export interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
}

export type RateLimitListener = (event: RateLimitEvent) => void;

export interface RateLimitEvent {
  type: 'waiting' | 'resumed';
  waitSeconds: number;
  attempt: number;
  maxRetries: number;
  releaseId: number;
  rateLimitInfo?: RateLimitInfo;
}

let lastRequestTime = 0;
let currentDelay = MIN_REQUEST_DELAY_MS;
let rateLimitListener: RateLimitListener | null = null;

export function setRateLimitListener(listener: RateLimitListener | null): void {
  rateLimitListener = listener;
}

function parseRateLimitHeaders(response: Response): RateLimitInfo | undefined {
  const limit = response.headers.get('X-Discogs-Ratelimit');
  const used = response.headers.get('X-Discogs-Ratelimit-Used');
  const remaining = response.headers.get('X-Discogs-Ratelimit-Remaining');

  if (limit && used && remaining) {
    return {
      limit: parseInt(limit, 10),
      used: parseInt(used, 10),
      remaining: parseInt(remaining, 10),
    };
  }
  return undefined;
}

function adjustDelay(rateLimitInfo: RateLimitInfo | undefined): void {
  if (!rateLimitInfo) return;

  if (rateLimitInfo.remaining <= RATE_LIMIT_LOW_THRESHOLD) {
    currentDelay = RATE_LIMIT_SLOW_DELAY_MS;
  } else {
    currentDelay = MIN_REQUEST_DELAY_MS;
  }
}

function parseRetryAfter(response: Response): number {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return DEFAULT_RETRY_WAIT_MS;
}

function abortableWait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timeout = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    }
  });
}

function extractReleaseId(url: string): number {
  const match = url.match(/\/(\d+)(?:\?|&|$)/);
  return match ? parseInt(match[1], 10) : 0;
}

function buildAuthHeaders(
  credentials: DiscogsCredentials,
): Record<string, string> {
  return {
    'X-Discogs-Consumer-Key': credentials.consumerKey,
    'X-Discogs-Consumer-Secret': credentials.consumerSecret,
  };
}

async function rateLimitedFetch(
  url: string,
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<Response> {
  const releaseId = extractReleaseId(url);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Pre-request delay
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < currentDelay) {
      await abortableWait(currentDelay - elapsed, signal);
    }

    lastRequestTime = Date.now();

    const response = await fetch(url, {
      headers: buildAuthHeaders(credentials),
      signal,
    });

    const rateLimitInfo = parseRateLimitHeaders(response);

    if (response.ok) {
      adjustDelay(rateLimitInfo);
      return response;
    }

    if (response.status === 429) {
      const retryWaitMs = parseRetryAfter(response);
      const backoffMs = retryWaitMs * Math.pow(BACKOFF_MULTIPLIER, attempt);
      const waitMs = Math.min(backoffMs, 120_000); // cap at 2 minutes

      if (attempt < MAX_RETRIES) {
        if (rateLimitListener) {
          rateLimitListener({
            type: 'waiting',
            waitSeconds: Math.ceil(waitMs / 1000),
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            releaseId,
            rateLimitInfo,
          });
        }

        await abortableWait(waitMs, signal);

        if (rateLimitListener) {
          rateLimitListener({
            type: 'resumed',
            waitSeconds: 0,
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            releaseId,
            rateLimitInfo,
          });
        }

        // After a 429, be more conservative
        currentDelay = RATE_LIMIT_SLOW_DELAY_MS;
        continue;
      }

      throw new DiscogsApiError(
        `Rate limit exceeded after ${MAX_RETRIES} retries`,
        429,
        releaseId,
      );
    }

    throw new DiscogsApiError(
      `Discogs API error: ${response.status} ${response.statusText}`,
      response.status,
      releaseId,
    );
  }

  // Should not reach here, but TypeScript needs it
  throw new DiscogsApiError(
    `Rate limit exceeded after ${MAX_RETRIES} retries`,
    429,
    releaseId,
  );
}

export async function fetchRelease(
  releaseId: number,
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<DiscogsReleaseResponse> {
  const url = `${BASE_URL}/releases/${releaseId}`;
  const response = await rateLimitedFetch(url, credentials, signal);
  return response.json() as Promise<DiscogsReleaseResponse>;
}

export async function fetchPriceSuggestions(
  releaseId: number,
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<DiscogsPriceSuggestionsResponse> {
  const url = `${BASE_URL}/marketplace/price_suggestions/${releaseId}`;
  const response = await rateLimitedFetch(url, credentials, signal);
  return response.json() as Promise<DiscogsPriceSuggestionsResponse>;
}

export function mapReleaseToMetadata(
  release: DiscogsReleaseResponse,
  priceSuggestionsResponse?: DiscogsPriceSuggestionsResponse,
): ReleaseMetadata {
  const primaryImage = release.images?.find((img) => img.type === 'primary');
  const firstImage = release.images?.[0];
  const image = primaryImage ?? firstImage;

  const tracklist: TracklistItem[] = release.tracklist
    .filter((t) => t.type_ === 'track')
    .map((t) => ({
      position: t.position,
      title: t.title,
      duration: t.duration,
    }));

  let priceSuggestions: Record<string, PriceSuggestion> | undefined;
  if (priceSuggestionsResponse) {
    priceSuggestions = {};
    for (const [condition, data] of Object.entries(
      priceSuggestionsResponse,
    )) {
      priceSuggestions[condition] = {
        currency: data.currency,
        value: data.value,
      };
    }
  }

  return {
    thumbUrl: image?.uri150,
    coverUrl: image?.uri,
    genres: release.genres ?? [],
    styles: release.styles ?? [],
    year: release.year ?? undefined,
    country: release.country ?? '',
    tracklist,
    lowestPrice: release.lowest_price ?? undefined,
    numForSale: release.num_for_sale ?? 0,
    communityHave: release.community?.have ?? 0,
    communityWant: release.community?.want ?? 0,
    communityRating: release.community?.rating?.average ?? undefined,
    priceSuggestions,
    discogsUrl: release.uri ?? '',
    lastFetched: new Date().toISOString(),
  };
}

export async function fetchReleaseWithPrices(
  releaseId: number,
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<ReleaseMetadata> {
  const release = await fetchRelease(releaseId, credentials, signal);

  let priceSuggestionsResponse: DiscogsPriceSuggestionsResponse | undefined;
  try {
    priceSuggestionsResponse = await fetchPriceSuggestions(
      releaseId,
      credentials,
      signal,
    );
  } catch (error) {
    // Price suggestions may fail (403 for some releases), continue without them
    // But 429 should propagate so the caller can handle retry state
    if (
      error instanceof DiscogsApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      console.warn(
        `Price suggestions unavailable for release ${releaseId}: ${error.message}`,
      );
    } else {
      throw error;
    }
  }

  return mapReleaseToMetadata(release, priceSuggestionsResponse);
}

export interface OAuthAuthorizeResponse {
  authorizeUrl: string;
}

export interface OAuthStatusResponse {
  authenticated: boolean;
}

export async function startOAuthFlow(
  credentials: DiscogsCredentials,
  callbackUrl: string,
): Promise<OAuthAuthorizeResponse> {
  const url = `${BASE_URL}/oauth/authorize?callback_url=${encodeURIComponent(callbackUrl)}`;
  const response = await fetch(url, {
    headers: buildAuthHeaders(credentials),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `OAuth authorize failed: ${response.status} ${response.statusText} ${body}`,
    );
  }

  return response.json() as Promise<OAuthAuthorizeResponse>;
}

export async function checkOAuthStatus(
  credentials: DiscogsCredentials,
): Promise<OAuthStatusResponse> {
  const url = `${BASE_URL}/oauth/status`;
  const response = await fetch(url, {
    headers: buildAuthHeaders(credentials),
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json() as Promise<OAuthStatusResponse>;
}

export async function revokeOAuthToken(
  credentials: DiscogsCredentials,
): Promise<void> {
  const url = `${BASE_URL}/oauth/token`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: buildAuthHeaders(credentials),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `OAuth revoke failed: ${response.status} ${response.statusText} ${body}`,
    );
  }
}

/** Reset the rate limiter (useful for testing) */
export function resetRateLimiter(): void {
  lastRequestTime = 0;
  currentDelay = MIN_REQUEST_DELAY_MS;
}
