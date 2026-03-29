import { useState, useCallback, useRef, useEffect } from 'react';
import {
  fetchReleaseWithPrices,
  setRateLimitListener,
  DiscogsApiError,
} from '../services/discogsApi';
import type { DiscogsCredentials } from '../services/discogsApi';
import type { RateLimitEvent } from '../services/discogsApi';
import {
  updateReleaseMetadata,
  getUnfetchedReleaseIds,
  getUniqueReleaseIds,
} from '../db/operations';

export interface FetchProgress {
  total: number;
  completed: number;
  errors: number;
  currentReleaseId: number | null;
  isRunning: boolean;
  rateLimitWait: RateLimitWait | null;
}

export interface RateLimitWait {
  waitSeconds: number;
  attempt: number;
  maxRetries: number;
  releaseId: number;
}

const INITIAL_PROGRESS: FetchProgress = {
  total: 0,
  completed: 0,
  errors: 0,
  currentReleaseId: null,
  isRunning: false,
  rateLimitWait: null,
};

export function useDiscogsFetch(
  credentials: DiscogsCredentials | null,
  onComplete: () => void,
) {
  const [progress, setProgress] = useState<FetchProgress>(INITIAL_PROGRESS);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const listener = (event: RateLimitEvent) => {
      if (event.type === 'waiting') {
        setProgress((prev) => ({
          ...prev,
          rateLimitWait: {
            waitSeconds: event.waitSeconds,
            attempt: event.attempt,
            maxRetries: event.maxRetries,
            releaseId: event.releaseId,
          },
        }));
      } else {
        setProgress((prev) => ({
          ...prev,
          rateLimitWait: null,
        }));
      }
    };

    setRateLimitListener(listener);
    return () => setRateLimitListener(null);
  }, []);

  const fetchAll = useCallback(
    async (unfetchedOnly: boolean = true) => {
      if (!credentials) return;

      const releaseIds = unfetchedOnly
        ? await getUnfetchedReleaseIds()
        : await getUniqueReleaseIds();

      if (releaseIds.length === 0) {
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setProgress({
        total: releaseIds.length,
        completed: 0,
        errors: 0,
        currentReleaseId: null,
        isRunning: true,
        rateLimitWait: null,
      });

      let completed = 0;
      let errors = 0;

      for (const releaseId of releaseIds) {
        if (controller.signal.aborted) break;

        setProgress((prev) => ({
          ...prev,
          currentReleaseId: releaseId,
          rateLimitWait: null,
        }));

        try {
          const metadata = await fetchReleaseWithPrices(
            releaseId,
            credentials,
            controller.signal,
          );
          await updateReleaseMetadata(releaseId, metadata);
          completed++;
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === 'AbortError'
          ) {
            break;
          }

          if (
            error instanceof DiscogsApiError &&
            error.status === 429
          ) {
            // All retries exhausted - log but continue with next item
            console.warn(
              `Rate limit retries exhausted for release ${releaseId}, skipping`,
            );
          } else {
            console.error(
              `Failed to fetch release ${releaseId}:`,
              error,
            );
          }
          errors++;
        }

        setProgress((prev) => ({
          ...prev,
          completed,
          errors,
          rateLimitWait: null,
        }));
      }

      setProgress((prev) => ({
        ...prev,
        currentReleaseId: null,
        isRunning: false,
        rateLimitWait: null,
      }));

      abortControllerRef.current = null;
      onComplete();
    },
    [credentials, onComplete],
  );

  const fetchSingle = useCallback(
    async (releaseId: number) => {
      if (!credentials) return;

      try {
        const metadata = await fetchReleaseWithPrices(
          releaseId,
          credentials,
        );
        await updateReleaseMetadata(releaseId, metadata);
        onComplete();
      } catch (error) {
        console.error(
          `Failed to fetch release ${releaseId}:`,
          error,
        );
        throw error;
      }
    },
    [credentials, onComplete],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    progress,
    fetchAll,
    fetchSingle,
    cancel,
  };
}
