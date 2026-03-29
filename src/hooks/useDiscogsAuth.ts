import { useState, useCallback, useEffect } from 'react';
import type { DiscogsCredentials } from '../services/discogsApi';
import {
  startOAuthFlow,
  checkOAuthStatus,
  revokeOAuthToken,
} from '../services/discogsApi';

const STORAGE_CONSUMER_KEY = 'my-collection-discogs-consumer-key';
const STORAGE_CONSUMER_SECRET = 'my-collection-discogs-consumer-secret';

function loadFromStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function saveToStorage(key: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage may be unavailable
  }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage may be unavailable
  }
}

export function useDiscogsAuth() {
  const [consumerKey, setConsumerKey] = useState(() =>
    loadFromStorage(STORAGE_CONSUMER_KEY),
  );
  const [consumerSecret, setConsumerSecret] = useState(() =>
    loadFromStorage(STORAGE_CONSUMER_SECRET),
  );
  const [isOAuthComplete, setIsOAuthComplete] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const hasCredentials =
    consumerKey.length > 0 && consumerSecret.length > 0;

  const isAuthenticated = hasCredentials && isOAuthComplete;

  const credentials: DiscogsCredentials | null = hasCredentials
    ? { consumerKey, consumerSecret }
    : null;

  // Check OAuth status on mount and when credentials change
  useEffect(() => {
    if (!hasCredentials) {
      setIsOAuthComplete(false);
      return;
    }

    // Detect ?oauth=success in URL (redirect back from Discogs)
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      window.history.replaceState({}, '', url.pathname + url.search);
    }

    // Check if worker has cached access token for these credentials
    const creds: DiscogsCredentials = { consumerKey, consumerSecret };
    setIsOAuthLoading(true);
    checkOAuthStatus(creds)
      .then((status) => {
        setIsOAuthComplete(status.authenticated);
      })
      .catch(() => {
        setIsOAuthComplete(false);
      })
      .finally(() => {
        setIsOAuthLoading(false);
      });
  }, [consumerKey, consumerSecret, hasCredentials]);

  const saveCredentials = useCallback(
    (key: string, secret: string) => {
      const trimmedKey = key.trim();
      const trimmedSecret = secret.trim();
      saveToStorage(STORAGE_CONSUMER_KEY, trimmedKey);
      saveToStorage(STORAGE_CONSUMER_SECRET, trimmedSecret);
      setConsumerKey(trimmedKey);
      setConsumerSecret(trimmedSecret);
    },
    [],
  );

  const clearCredentials = useCallback(() => {
    // Also revoke OAuth token when clearing credentials
    if (credentials) {
      revokeOAuthToken(credentials).catch(() => {
        // Best effort — credential removal continues even if revoke fails
      });
    }
    removeFromStorage(STORAGE_CONSUMER_KEY);
    removeFromStorage(STORAGE_CONSUMER_SECRET);
    setConsumerKey('');
    setConsumerSecret('');
    setIsOAuthComplete(false);
  }, [credentials]);

  const startOAuth = useCallback(async () => {
    if (!credentials) return;

    setIsOAuthLoading(true);
    try {
      const callbackUrl = window.location.origin + window.location.pathname;
      const result = await startOAuthFlow(credentials, callbackUrl);
      // Redirect user to Discogs authorization page
      window.location.href = result.authorizeUrl;
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
      setIsOAuthLoading(false);
      throw error;
    }
  }, [credentials]);

  const disconnect = useCallback(async () => {
    if (!credentials) return;

    setIsOAuthLoading(true);
    try {
      await revokeOAuthToken(credentials);
      setIsOAuthComplete(false);
    } catch (error) {
      console.error('Failed to revoke OAuth token:', error);
      throw error;
    } finally {
      setIsOAuthLoading(false);
    }
  }, [credentials]);

  return {
    consumerKey,
    consumerSecret,
    hasCredentials,
    isAuthenticated,
    isOAuthComplete,
    isOAuthLoading,
    credentials,
    saveCredentials,
    clearCredentials,
    startOAuth,
    disconnect,
  };
}
