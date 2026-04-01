import type { TracklistItem, PriceSuggestion, CollectionItem } from '../db/types';
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
  method: string = 'GET',
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
      method,
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
  const response = await rateLimitedFetch(url, credentials);
  return response.json() as Promise<OAuthAuthorizeResponse>;
}

export async function checkOAuthStatus(
  credentials: DiscogsCredentials,
): Promise<OAuthStatusResponse> {
  const url = `${BASE_URL}/oauth/status`;
  try {
    const response = await rateLimitedFetch(url, credentials);
    return response.json() as Promise<OAuthStatusResponse>;
  } catch {
    // Non-OK responses (401, etc.) mean not authenticated
    return { authenticated: false };
  }
}

export async function revokeOAuthToken(
  credentials: DiscogsCredentials,
): Promise<void> {
  const url = `${BASE_URL}/oauth/token`;
  await rateLimitedFetch(url, credentials, undefined, 'DELETE');
}

/** Reset the rate limiter (useful for testing) */
export function resetRateLimiter(): void {
  lastRequestTime = 0;
  currentDelay = MIN_REQUEST_DELAY_MS;
}

// --- Collection API types ---

export interface DiscogsIdentityResponse {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}

export interface DiscogsCollectionFolder {
  id: number;
  count: number;
  name: string;
  resource_url: string;
}

export interface DiscogsCollectionFormat {
  name: string;
  qty: string;
  descriptions?: string[];
}

export interface DiscogsCollectionRelease {
  id: number;
  instance_id: number;
  folder_id: number;
  rating: number;
  date_added: string;
  basic_information: {
    id: number;
    title: string;
    year: number;
    resource_url: string;
    thumb: string;
    cover_image: string;
    formats: DiscogsCollectionFormat[];
    labels: Array<{ name: string; catno: string; id: number }>;
    artists: Array<{ name: string; id: number }>;
    genres?: string[];
    styles?: string[];
  };
}

export interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
}

export interface DiscogsCollectionResponse {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionRelease[];
}

// --- Collection API functions ---

export async function fetchIdentity(
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<DiscogsIdentityResponse> {
  const url = `${BASE_URL}/oauth/identity`;
  const response = await rateLimitedFetch(url, credentials, signal);
  return response.json() as Promise<DiscogsIdentityResponse>;
}

export async function fetchCollectionFolders(
  username: string,
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<DiscogsCollectionFolder[]> {
  const url = `${BASE_URL}/users/${encodeURIComponent(username)}/collection/folders`;
  const response = await rateLimitedFetch(url, credentials, signal);
  const data = (await response.json()) as { folders: DiscogsCollectionFolder[] };
  return data.folders;
}

export async function fetchCollectionPage(
  username: string,
  folderId: number,
  page: number,
  perPage: number,
  credentials: DiscogsCredentials,
  signal?: AbortSignal,
): Promise<DiscogsCollectionResponse> {
  const url = `${BASE_URL}/users/${encodeURIComponent(username)}/collection/folders/${folderId}/releases?page=${page}&per_page=${perPage}`;
  const response = await rateLimitedFetch(url, credentials, signal);
  return response.json() as Promise<DiscogsCollectionResponse>;
}

export function buildFormatString(
  formats: DiscogsCollectionFormat[],
): string {
  if (!formats || formats.length === 0) return '';

  const fmt = formats[0];
  const qty = parseInt(fmt.qty, 10);
  const prefix = qty > 1 ? `${qty}x` : '';
  const parts = [prefix + fmt.name];

  if (fmt.descriptions && fmt.descriptions.length > 0) {
    parts.push(...fmt.descriptions);
  }

  return parts.join(', ');
}

export function mapCollectionReleaseToItem(
  release: DiscogsCollectionRelease,
  folderName: string,
): Omit<CollectionItem, 'id'> {
  const bi = release.basic_information;
  const artist = bi.artists.map((a) => a.name).join(', ');
  const label = bi.labels.length > 0 ? bi.labels[0].name : '';
  const catalogNumber = bi.labels.length > 0 ? bi.labels[0].catno : '';
  const format = buildFormatString(bi.formats);

  return {
    catalogNumber,
    artist,
    title: bi.title,
    label,
    format,
    rating: release.rating > 0 ? String(release.rating) : '',
    released: bi.year > 0 ? String(bi.year) : '',
    releaseId: bi.id,
    collectionFolder: folderName,
    dateAdded: release.date_added,
    mediaCondition: '',
    sleeveCondition: '',
    collectionNotes: '',
    purchasePrice: null,
    thumbUrl: bi.thumb || undefined,
    coverUrl: bi.cover_image || undefined,
    genres: bi.genres ?? [],
    styles: bi.styles ?? [],
    year: bi.year > 0 ? bi.year : undefined,
  };
}
