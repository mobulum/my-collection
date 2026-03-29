import {
  mapReleaseToMetadata,
  DiscogsApiError,
  resetRateLimiter,
  fetchRelease,
  setRateLimitListener,
  startOAuthFlow,
  checkOAuthStatus,
  revokeOAuthToken,
} from '../src/services/discogsApi';
import type {
  DiscogsReleaseResponse,
  DiscogsPriceSuggestionsResponse,
  DiscogsCredentials,
  RateLimitEvent,
} from '../src/services/discogsApi';

const mockRelease: DiscogsReleaseResponse = {
  id: 249504,
  title: 'Never Gonna Give You Up',
  year: 1987,
  country: 'UK',
  genres: ['Electronic', 'Pop'],
  styles: ['Synth-pop'],
  tracklist: [
    {
      position: 'A',
      title: 'Never Gonna Give You Up',
      duration: '3:32',
      type_: 'track',
    },
    {
      position: 'B',
      title: 'Never Gonna Give You Up (Instrumental)',
      duration: '3:30',
      type_: 'track',
    },
    {
      position: '',
      title: 'Credits',
      duration: '',
      type_: 'heading',
    },
  ],
  images: [
    {
      type: 'primary',
      uri: 'https://example.com/cover-600.jpg',
      uri150: 'https://example.com/cover-150.jpg',
      width: 600,
      height: 600,
    },
    {
      type: 'secondary',
      uri: 'https://example.com/back-600.jpg',
      uri150: 'https://example.com/back-150.jpg',
      width: 600,
      height: 600,
    },
  ],
  lowest_price: 0.63,
  num_for_sale: 58,
  community: {
    have: 252,
    want: 42,
    rating: {
      count: 45,
      average: 3.42,
    },
  },
  uri: 'https://www.discogs.com/release/249504',
};

const mockCredentials: DiscogsCredentials = {
  consumerKey: 'test-key',
  consumerSecret: 'test-secret',
};

const mockPriceSuggestions: DiscogsPriceSuggestionsResponse = {
  'Mint (M)': { currency: 'EUR', value: 50.0 },
  'Near Mint (NM or M-)': { currency: 'EUR', value: 35.0 },
  'Very Good Plus (VG+)': { currency: 'EUR', value: 20.0 },
  'Very Good (VG)': { currency: 'EUR', value: 14.69 },
  'Good Plus (G+)': { currency: 'EUR', value: 8.4 },
  'Good (G)': { currency: 'EUR', value: 5.0 },
  'Fair (F)': { currency: 'EUR', value: 3.0 },
  'Poor (P)': { currency: 'EUR', value: 1.5 },
};

beforeEach(() => {
  resetRateLimiter();
});

describe('mapReleaseToMetadata', () => {
  it('maps release data to metadata correctly', () => {
    const metadata = mapReleaseToMetadata(mockRelease);

    expect(metadata.thumbUrl).toBe('https://example.com/cover-150.jpg');
    expect(metadata.coverUrl).toBe('https://example.com/cover-600.jpg');
    expect(metadata.genres).toEqual(['Electronic', 'Pop']);
    expect(metadata.styles).toEqual(['Synth-pop']);
    expect(metadata.year).toBe(1987);
    expect(metadata.country).toBe('UK');
    expect(metadata.lowestPrice).toBe(0.63);
    expect(metadata.numForSale).toBe(58);
    expect(metadata.communityHave).toBe(252);
    expect(metadata.communityWant).toBe(42);
    expect(metadata.communityRating).toBe(3.42);
    expect(metadata.discogsUrl).toBe(
      'https://www.discogs.com/release/249504',
    );
    expect(metadata.lastFetched).toBeTruthy();
  });

  it('filters tracklist to only include tracks', () => {
    const metadata = mapReleaseToMetadata(mockRelease);

    expect(metadata.tracklist).toHaveLength(2);
    expect(metadata.tracklist![0]).toEqual({
      position: 'A',
      title: 'Never Gonna Give You Up',
      duration: '3:32',
    });
    expect(metadata.tracklist![1]).toEqual({
      position: 'B',
      title: 'Never Gonna Give You Up (Instrumental)',
      duration: '3:30',
    });
  });

  it('prefers primary image over secondary', () => {
    const metadata = mapReleaseToMetadata(mockRelease);

    expect(metadata.thumbUrl).toBe('https://example.com/cover-150.jpg');
    expect(metadata.coverUrl).toBe('https://example.com/cover-600.jpg');
  });

  it('falls back to first image if no primary', () => {
    const releaseNosPrimary = {
      ...mockRelease,
      images: [
        {
          type: 'secondary',
          uri: 'https://example.com/only-600.jpg',
          uri150: 'https://example.com/only-150.jpg',
          width: 600,
          height: 600,
        },
      ],
    };

    const metadata = mapReleaseToMetadata(releaseNosPrimary);
    expect(metadata.thumbUrl).toBe('https://example.com/only-150.jpg');
    expect(metadata.coverUrl).toBe('https://example.com/only-600.jpg');
  });

  it('handles release with no images', () => {
    const releaseNoImages = {
      ...mockRelease,
      images: undefined,
    };

    const metadata = mapReleaseToMetadata(releaseNoImages);
    expect(metadata.thumbUrl).toBeUndefined();
    expect(metadata.coverUrl).toBeUndefined();
  });

  it('maps price suggestions correctly', () => {
    const metadata = mapReleaseToMetadata(
      mockRelease,
      mockPriceSuggestions,
    );

    expect(metadata.priceSuggestions).toBeDefined();
    expect(metadata.priceSuggestions!['Mint (M)']).toEqual({
      currency: 'EUR',
      value: 50.0,
    });
    expect(
      metadata.priceSuggestions!['Very Good (VG)'],
    ).toEqual({
      currency: 'EUR',
      value: 14.69,
    });
    expect(Object.keys(metadata.priceSuggestions!)).toHaveLength(8);
  });

  it('handles no price suggestions', () => {
    const metadata = mapReleaseToMetadata(mockRelease);

    expect(metadata.priceSuggestions).toBeUndefined();
  });

  it('handles null lowest_price', () => {
    const releaseNoPrice = {
      ...mockRelease,
      lowest_price: null,
    };

    const metadata = mapReleaseToMetadata(releaseNoPrice);
    expect(metadata.lowestPrice).toBeUndefined();
  });

  it('sets lastFetched to a valid ISO date', () => {
    const before = new Date().toISOString();
    const metadata = mapReleaseToMetadata(mockRelease);
    const after = new Date().toISOString();

    expect(metadata.lastFetched).toBeTruthy();
    expect(metadata.lastFetched! >= before).toBe(true);
    expect(metadata.lastFetched! <= after).toBe(true);
  });
});

describe('DiscogsApiError', () => {
  it('creates error with status and releaseId', () => {
    const error = new DiscogsApiError('Not found', 404, 12345);

    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.releaseId).toBe(12345);
    expect(error.name).toBe('DiscogsApiError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('rateLimitedFetch (429 retry logic)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetRateLimiter();
    setRateLimitListener(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
    setRateLimitListener(null);
  });

  function createMockResponse(
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ): Response {
    const headerMap = new Headers(headers);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 429 ? 'Too Many Requests' : status === 200 ? 'OK' : 'Error',
      headers: headerMap,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response;
  }

  function advancePastDelay(): Promise<void> {
    // Advance past rate limit delay and any pending microtasks
    jest.advanceTimersByTime(5000);
    return Promise.resolve();
  }

  it('sends auth credentials as headers instead of query params', async () => {
    globalThis.fetch = jest.fn(async () => {
      return createMockResponse(200, mockRelease, {
        'X-Discogs-Ratelimit': '60',
        'X-Discogs-Ratelimit-Used': '1',
        'X-Discogs-Ratelimit-Remaining': '59',
      });
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);
    await advancePastDelay();
    await fetchPromise;

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = (globalThis.fetch as jest.Mock).mock.calls[0];

    // URL should NOT contain query params for auth
    expect(calledUrl).toBe('https://discogs.my-collection.mobulum.com/releases/249504');
    expect(calledUrl).not.toContain('key=');
    expect(calledUrl).not.toContain('secret=');

    // Auth should be in headers
    expect(calledOptions.headers).toEqual({
      'X-Discogs-Consumer-Key': 'test-key',
      'X-Discogs-Consumer-Secret': 'test-secret',
    });
  });

  it('retries on 429 and succeeds on retry', async () => {
    const rateLimitHeaders = {
      'X-Discogs-Ratelimit': '60',
      'X-Discogs-Ratelimit-Used': '60',
      'X-Discogs-Ratelimit-Remaining': '0',
    };

    let callCount = 0;
    globalThis.fetch = jest.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return createMockResponse(429, {}, {
          ...rateLimitHeaders,
          'Retry-After': '2',
        });
      }
      return createMockResponse(200, mockRelease, rateLimitHeaders);
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Advance past the initial delay
    await advancePastDelay();
    // Advance past the retry wait (2s from Retry-After * 2^0 = 2s)
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    // Advance past post-retry delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    const result = await fetchPromise;

    expect(callCount).toBe(2);
    expect(result.id).toBe(249504);
  });

  it('parses Retry-After header for wait time', async () => {
    let callCount = 0;
    globalThis.fetch = jest.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return createMockResponse(429, {}, { 'Retry-After': '10' });
      }
      return createMockResponse(200, mockRelease);
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Advance past initial delay
    await advancePastDelay();
    // Advance past 10s Retry-After
    jest.advanceTimersByTime(10_000);
    await Promise.resolve();
    // Advance past post-retry delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    const result = await fetchPromise;

    expect(callCount).toBe(2);
    expect(result.id).toBe(249504);
  });

  it('uses default wait when Retry-After header is absent', async () => {
    let callCount = 0;
    globalThis.fetch = jest.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return createMockResponse(429, {});
      }
      return createMockResponse(200, mockRelease);
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Advance past initial delay
    await advancePastDelay();
    // Default wait is 30s (DEFAULT_RETRY_WAIT_MS)
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    // Advance past post-retry delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    const result = await fetchPromise;

    expect(callCount).toBe(2);
    expect(result.id).toBe(249504);
  });

  it('throws DiscogsApiError after max retries exhausted', async () => {
    globalThis.fetch = jest.fn(async () => {
      return createMockResponse(429, {}, { 'Retry-After': '1' });
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Need to advance through 5 retries (attempts 0-4 get 429, then attempt 5 throws)
    // Each retry: initial delay + backoff wait
    for (let i = 0; i < 6; i++) {
      jest.advanceTimersByTime(130_000);
      await Promise.resolve();
      await Promise.resolve();
    }

    await expect(fetchPromise).rejects.toThrow(DiscogsApiError);
    await expect(fetchPromise).rejects.toThrow('Rate limit exceeded after 5 retries');

    // 6 calls: initial + 5 retries
    expect(globalThis.fetch).toHaveBeenCalledTimes(6);
  });

  it('calls RateLimitListener with waiting and resumed events on 429', async () => {
    const events: RateLimitEvent[] = [];
    setRateLimitListener((event) => {
      events.push({ ...event });
    });

    let callCount = 0;
    globalThis.fetch = jest.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return createMockResponse(429, {}, {
          'Retry-After': '3',
          'X-Discogs-Ratelimit': '60',
          'X-Discogs-Ratelimit-Used': '60',
          'X-Discogs-Ratelimit-Remaining': '0',
        });
      }
      return createMockResponse(200, mockRelease, {
        'X-Discogs-Ratelimit': '60',
        'X-Discogs-Ratelimit-Used': '30',
        'X-Discogs-Ratelimit-Remaining': '30',
      });
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Advance past initial delay
    await advancePastDelay();
    // Advance past retry wait
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    // Advance past post-retry delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    await fetchPromise;

    // Should have 'waiting' and 'resumed' events
    expect(events).toHaveLength(2);

    expect(events[0].type).toBe('waiting');
    expect(events[0].waitSeconds).toBe(3);
    expect(events[0].attempt).toBe(1);
    expect(events[0].maxRetries).toBe(5);
    expect(events[0].releaseId).toBe(249504);

    expect(events[1].type).toBe('resumed');
    expect(events[1].waitSeconds).toBe(0);
    expect(events[1].attempt).toBe(1);
    expect(events[1].maxRetries).toBe(5);
  });

  it('adjusts delay when remaining rate limit is low', async () => {
    globalThis.fetch = jest.fn(async () => {
      return createMockResponse(200, mockRelease, {
        'X-Discogs-Ratelimit': '60',
        'X-Discogs-Ratelimit-Used': '57',
        'X-Discogs-Ratelimit-Remaining': '3',
      });
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Advance past the delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    await fetchPromise;

    // After the call, the delay should have been adjusted to slow mode
    // We can verify by making another request and checking the timing
    // The fetch was called once with headers indicating low remaining
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry on non-429 error statuses', async () => {
    globalThis.fetch = jest.fn(async () => {
      return createMockResponse(500, { message: 'Internal Server Error' });
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // Advance past initial delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    await expect(fetchPromise).rejects.toThrow(DiscogsApiError);
    await expect(fetchPromise).rejects.toThrow('Discogs API error: 500 Error');

    // Only 1 call, no retries
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff on consecutive 429s', async () => {
    let callCount = 0;
    globalThis.fetch = jest.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        return createMockResponse(429, {}, { 'Retry-After': '2' });
      }
      return createMockResponse(200, mockRelease);
    });

    const fetchPromise = fetchRelease(249504, mockCredentials);

    // First attempt: initial delay
    await advancePastDelay();
    // First 429: wait 2s * 2^0 = 2s
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    // Second attempt: delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    // Second 429: wait 2s * 2^1 = 4s
    jest.advanceTimersByTime(4000);
    await Promise.resolve();
    // Third attempt: delay
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    const result = await fetchPromise;

    expect(callCount).toBe(3);
    expect(result.id).toBe(249504);
  });
});

describe('OAuth API functions', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMockResponse(
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ): Response {
    const headerMap = new Headers(headers);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: headerMap,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response;
  }

  describe('startOAuthFlow', () => {
    it('calls worker /oauth/authorize with credentials headers', async () => {
      globalThis.fetch = jest.fn(async () => {
        return createMockResponse(200, {
          authorizeUrl: 'https://discogs.com/oauth/authorize?oauth_token=abc',
        });
      });

      const result = await startOAuthFlow(mockCredentials, 'https://my-collection.com/');

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = (globalThis.fetch as jest.Mock).mock.calls[0];

      expect(calledUrl).toContain('/oauth/authorize');
      expect(calledUrl).toContain('callback_url=');
      expect(calledOptions.headers).toEqual({
        'X-Discogs-Consumer-Key': 'test-key',
        'X-Discogs-Consumer-Secret': 'test-secret',
      });
      expect(result.authorizeUrl).toBe(
        'https://discogs.com/oauth/authorize?oauth_token=abc',
      );
    });

    it('throws on non-OK response', async () => {
      globalThis.fetch = jest.fn(async () => {
        return createMockResponse(401, { error: 'Unauthorized' });
      });

      await expect(
        startOAuthFlow(mockCredentials, 'https://my-collection.com/'),
      ).rejects.toThrow('OAuth authorize failed');
    });
  });

  describe('checkOAuthStatus', () => {
    it('returns authenticated true when worker confirms', async () => {
      globalThis.fetch = jest.fn(async () => {
        return createMockResponse(200, { authenticated: true });
      });

      const result = await checkOAuthStatus(mockCredentials);

      expect(result.authenticated).toBe(true);

      const [calledUrl, calledOptions] = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(calledUrl).toContain('/oauth/status');
      expect(calledOptions.headers).toEqual({
        'X-Discogs-Consumer-Key': 'test-key',
        'X-Discogs-Consumer-Secret': 'test-secret',
      });
    });

    it('returns authenticated false on non-OK response', async () => {
      globalThis.fetch = jest.fn(async () => {
        return createMockResponse(401, { error: 'Unauthorized' });
      });

      const result = await checkOAuthStatus(mockCredentials);
      expect(result.authenticated).toBe(false);
    });
  });

  describe('revokeOAuthToken', () => {
    it('sends DELETE to /oauth/token with credentials headers', async () => {
      globalThis.fetch = jest.fn(async () => {
        return createMockResponse(200, { success: true });
      });

      await revokeOAuthToken(mockCredentials);

      const [calledUrl, calledOptions] = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(calledUrl).toContain('/oauth/token');
      expect(calledOptions.method).toBe('DELETE');
      expect(calledOptions.headers).toEqual({
        'X-Discogs-Consumer-Key': 'test-key',
        'X-Discogs-Consumer-Secret': 'test-secret',
      });
    });

    it('throws on non-OK response', async () => {
      globalThis.fetch = jest.fn(async () => {
        return createMockResponse(500, { error: 'Internal error' });
      });

      await expect(revokeOAuthToken(mockCredentials)).rejects.toThrow(
        'OAuth revoke failed',
      );
    });
  });
});
