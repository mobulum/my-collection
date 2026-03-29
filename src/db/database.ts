import Dexie, { type Table } from 'dexie';
import type { CollectionItem } from './types';

export class CollectionDatabase extends Dexie {
  collection!: Table<CollectionItem, number>;

  constructor() {
    super('MyCollectionDB');

    this.version(1).stores({
      collection:
        '++id, [releaseId+dateAdded], artist, title, collectionFolder, dateAdded, purchasePrice',
    });

    this.version(2).stores({
      collection:
        '++id, [releaseId+dateAdded], artist, title, collectionFolder, dateAdded, purchasePrice, releaseId, lastFetched',
    });
  }
}

export const db = new CollectionDatabase();
