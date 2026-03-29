import { db } from './database';
import type { CollectionItem } from './types';

export interface ReleaseMetadata {
  thumbUrl?: string;
  coverUrl?: string;
  genres?: string[];
  styles?: string[];
  year?: number;
  country?: string;
  tracklist?: CollectionItem['tracklist'];
  lowestPrice?: number;
  numForSale?: number;
  communityHave?: number;
  communityWant?: number;
  communityRating?: number;
  priceSuggestions?: CollectionItem['priceSuggestions'];
  discogsUrl?: string;
  lastFetched: string;
}

export async function addItems(
  items: Omit<CollectionItem, 'id'>[]
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = await db.collection
      .where('[releaseId+dateAdded]')
      .equals([item.releaseId, item.dateAdded])
      .first();

    if (existing) {
      skipped++;
    } else {
      await db.collection.add(item);
      added++;
    }
  }

  return { added, skipped };
}

export async function getAllItems(): Promise<CollectionItem[]> {
  return db.collection.toArray();
}

export async function updatePurchasePrice(
  id: number,
  price: number | null
): Promise<void> {
  await db.collection.update(id, { purchasePrice: price });
}

export async function updateReleaseMetadata(
  releaseId: number,
  metadata: ReleaseMetadata
): Promise<number> {
  const items = await db.collection
    .where('releaseId')
    .equals(releaseId)
    .toArray();

  let updated = 0;
  for (const item of items) {
    if (item.id !== undefined) {
      await db.collection.update(item.id, metadata as Partial<CollectionItem>);
      updated++;
    }
  }

  return updated;
}

export async function getUniqueReleaseIds(): Promise<number[]> {
  const items = await db.collection.toArray();
  return [...new Set(items.map((item) => item.releaseId))];
}

export async function getUnfetchedReleaseIds(): Promise<number[]> {
  const items = await db.collection
    .filter((item) => !item.lastFetched)
    .toArray();
  return [...new Set(items.map((item) => item.releaseId))];
}

export async function getItemCount(): Promise<number> {
  return db.collection.count();
}

export async function clearAll(): Promise<void> {
  await db.collection.clear();
}
