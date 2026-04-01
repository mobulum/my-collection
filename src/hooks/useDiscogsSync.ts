import { useState, useCallback, useRef } from 'react';
import {
  fetchIdentity,
  fetchCollectionFolders,
  fetchCollectionPage,
  mapCollectionReleaseToItem,
} from '../services/discogsApi';
import type { DiscogsCredentials } from '../services/discogsApi';
import { addItems, getUniqueReleaseIds } from '../db/operations';

export type SyncPhase =
  | 'idle'
  | 'identity'
  | 'folders'
  | 'releases'
  | 'saving'
  | 'done';

export interface SyncProgress {
  phase: SyncPhase;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  added: number;
  skipped: number;
  isRunning: boolean;
  error: string | null;
}

const INITIAL_SYNC_PROGRESS: SyncProgress = {
  phase: 'idle',
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
  added: 0,
  skipped: 0,
  isRunning: false,
  error: null,
};

const RELEASES_PER_PAGE = 100;

export function useDiscogsSync(
  credentials: DiscogsCredentials | null,
  onComplete: () => void,
) {
  const [syncProgress, setSyncProgress] =
    useState<SyncProgress>(INITIAL_SYNC_PROGRESS);
  const abortControllerRef = useRef<AbortController | null>(null);

  const syncCollection = useCallback(async () => {
    if (!credentials) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setSyncProgress({
      ...INITIAL_SYNC_PROGRESS,
      phase: 'identity',
      isRunning: true,
    });

    try {
      // 1. Fetch identity to get username
      const identity = await fetchIdentity(credentials, signal);
      const username = identity.username;

      // 2. Fetch collection folders to build folder name map
      setSyncProgress((prev) => ({ ...prev, phase: 'folders' }));
      const folders = await fetchCollectionFolders(
        username,
        credentials,
        signal,
      );
      const folderMap = new Map<number, string>();
      for (const folder of folders) {
        folderMap.set(folder.id, folder.name);
      }

      // 3. Get existing release IDs for dedup
      const existingIds = new Set(await getUniqueReleaseIds());

      // 4. Fetch all pages from folder 0 (All)
      setSyncProgress((prev) => ({ ...prev, phase: 'releases' }));

      const firstPage = await fetchCollectionPage(
        username,
        0,
        1,
        RELEASES_PER_PAGE,
        credentials,
        signal,
      );

      const totalPages = firstPage.pagination.pages;
      const totalItems = firstPage.pagination.items;

      setSyncProgress((prev) => ({
        ...prev,
        totalPages,
        totalItems,
        currentPage: 1,
      }));

      // Collect new items from all pages
      const allNewItems: ReturnType<typeof mapCollectionReleaseToItem>[] = [];

      // Process first page
      for (const release of firstPage.releases) {
        if (!existingIds.has(release.basic_information.id)) {
          const fName = folderMap.get(release.folder_id) ?? '';
          allNewItems.push(mapCollectionReleaseToItem(release, fName));
        }
      }

      // Fetch remaining pages
      for (let page = 2; page <= totalPages; page++) {
        if (signal.aborted) break;

        setSyncProgress((prev) => ({ ...prev, currentPage: page }));

        const pageData = await fetchCollectionPage(
          username,
          0,
          page,
          RELEASES_PER_PAGE,
          credentials,
          signal,
        );

        for (const release of pageData.releases) {
          if (!existingIds.has(release.basic_information.id)) {
            const fName = folderMap.get(release.folder_id) ?? '';
            allNewItems.push(mapCollectionReleaseToItem(release, fName));
          }
        }
      }

      if (signal.aborted) return;

      // 5. Save to database
      setSyncProgress((prev) => ({ ...prev, phase: 'saving' }));
      const { added, skipped } = await addItems(allNewItems);

      // 6. Done
      setSyncProgress((prev) => ({
        ...prev,
        phase: 'done',
        added,
        skipped,
        isRunning: false,
      }));

      abortControllerRef.current = null;
      onComplete();
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        setSyncProgress((prev) => ({
          ...prev,
          isRunning: false,
          phase: 'idle',
        }));
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync error:', error);
      setSyncProgress((prev) => ({
        ...prev,
        isRunning: false,
        error: message,
      }));
    }
  }, [credentials, onComplete]);

  const cancelSync = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearSyncStatus = useCallback(() => {
    setSyncProgress(INITIAL_SYNC_PROGRESS);
  }, []);

  return {
    syncProgress,
    syncCollection,
    cancelSync,
    clearSyncStatus,
  };
}
