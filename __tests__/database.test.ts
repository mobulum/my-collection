import { CollectionDatabase } from '../src/db/database';
import {
  addItems,
  updatePurchasePrice,
  updateReleaseMetadata,
  getAllItems,
  getItemCount,
  getUniqueReleaseIds,
  getUnfetchedReleaseIds,
  clearAll,
} from '../src/db/operations';
import type { CollectionItem } from '../src/db/types';
import type { ReleaseMetadata } from '../src/db/operations';

// Use a fresh database for each test
let testDb: CollectionDatabase;

function makeItem(overrides: Partial<Omit<CollectionItem, 'id'>> = {}): Omit<CollectionItem, 'id'> {
  return {
    catalogNumber: '123',
    artist: 'Test Artist',
    title: 'Test Title',
    label: 'Test Label',
    format: 'CD, Album',
    rating: '',
    released: '2020',
    releaseId: 12345,
    collectionFolder: 'Uncategorized',
    dateAdded: '2025-01-01 00:00:00',
    mediaCondition: 'Mint (M)',
    sleeveCondition: 'Mint (M)',
    collectionNotes: '',
    purchasePrice: null,
    ...overrides,
  };
}

beforeEach(async () => {
  // Reset the database before each test
  testDb = new CollectionDatabase();
  await testDb.collection.clear();
});

afterEach(async () => {
  await testDb.collection.clear();
});

describe('database operations', () => {
  describe('addItems', () => {
    it('adds new items to the database', async () => {
      const items = [
        makeItem({ artist: 'Metallica', releaseId: 1, dateAdded: '2025-01-01 00:00:00' }),
        makeItem({ artist: 'Iron Maiden', releaseId: 2, dateAdded: '2025-01-02 00:00:00' }),
      ];

      const result = await addItems(items);

      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);

      const count = await getItemCount();
      expect(count).toBe(2);
    });

    it('skips duplicate items based on releaseId + dateAdded', async () => {
      const item = makeItem({ releaseId: 100, dateAdded: '2025-03-01 10:00:00' });

      await addItems([item]);
      const result = await addItems([item]);

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);

      const count = await getItemCount();
      expect(count).toBe(1);
    });

    it('allows same releaseId with different dateAdded', async () => {
      const item1 = makeItem({ releaseId: 100, dateAdded: '2025-01-01 00:00:00' });
      const item2 = makeItem({ releaseId: 100, dateAdded: '2025-02-01 00:00:00' });

      const result1 = await addItems([item1]);
      const result2 = await addItems([item2]);

      expect(result1.added).toBe(1);
      expect(result2.added).toBe(1);

      const count = await getItemCount();
      expect(count).toBe(2);
    });

    it('handles mix of new and existing items', async () => {
      const existing = makeItem({ releaseId: 1, dateAdded: '2025-01-01 00:00:00' });
      const newItem = makeItem({ releaseId: 2, dateAdded: '2025-02-01 00:00:00' });

      await addItems([existing]);
      const result = await addItems([existing, newItem]);

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('updatePurchasePrice', () => {
    it('updates purchase price for an item', async () => {
      await addItems([makeItem({ releaseId: 1, dateAdded: '2025-01-01 00:00:00' })]);
      const items = await getAllItems();
      const id = items[0].id!;

      await updatePurchasePrice(id, 29.99);

      const updated = await getAllItems();
      expect(updated[0].purchasePrice).toBe(29.99);
    });

    it('sets purchase price to null', async () => {
      await addItems([makeItem({ releaseId: 1, dateAdded: '2025-01-01 00:00:00', purchasePrice: 10 })]);
      const items = await getAllItems();
      const id = items[0].id!;

      await updatePurchasePrice(id, null);

      const updated = await getAllItems();
      expect(updated[0].purchasePrice).toBeNull();
    });
  });

  describe('getAllItems', () => {
    it('returns all items', async () => {
      await addItems([
        makeItem({ artist: 'A', releaseId: 1, dateAdded: '2025-01-01 00:00:00' }),
        makeItem({ artist: 'B', releaseId: 2, dateAdded: '2025-01-02 00:00:00' }),
      ]);

      const items = await getAllItems();
      expect(items).toHaveLength(2);
    });

    it('returns empty array when no items exist', async () => {
      const items = await getAllItems();
      expect(items).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('removes all items from database', async () => {
      await addItems([
        makeItem({ releaseId: 1, dateAdded: '2025-01-01 00:00:00' }),
        makeItem({ releaseId: 2, dateAdded: '2025-01-02 00:00:00' }),
      ]);

      await clearAll();
      const count = await getItemCount();
      expect(count).toBe(0);
    });
  });

  describe('updateReleaseMetadata', () => {
    it('updates metadata for all items with matching releaseId', async () => {
      await addItems([
        makeItem({ releaseId: 100, dateAdded: '2025-01-01 00:00:00' }),
        makeItem({ releaseId: 100, dateAdded: '2025-02-01 00:00:00' }),
        makeItem({ releaseId: 200, dateAdded: '2025-03-01 00:00:00' }),
      ]);

      const metadata: ReleaseMetadata = {
        thumbUrl: 'https://example.com/thumb.jpg',
        coverUrl: 'https://example.com/cover.jpg',
        genres: ['Rock', 'Metal'],
        styles: ['Heavy Metal'],
        year: 1986,
        country: 'US',
        tracklist: [
          { position: '1', title: 'Track 1', duration: '3:00' },
        ],
        lowestPrice: 15.99,
        numForSale: 42,
        communityHave: 1000,
        communityWant: 500,
        communityRating: 4.5,
        priceSuggestions: {
          'Mint (M)': { currency: 'EUR', value: 50.0 },
        },
        discogsUrl: 'https://www.discogs.com/release/100',
        lastFetched: '2025-03-29T12:00:00.000Z',
      };

      const updated = await updateReleaseMetadata(100, metadata);
      expect(updated).toBe(2);

      const items = await getAllItems();
      const release100Items = items.filter((i) => i.releaseId === 100);
      expect(release100Items).toHaveLength(2);
      expect(release100Items[0].thumbUrl).toBe('https://example.com/thumb.jpg');
      expect(release100Items[0].genres).toEqual(['Rock', 'Metal']);
      expect(release100Items[0].year).toBe(1986);
      expect(release100Items[0].lastFetched).toBe('2025-03-29T12:00:00.000Z');

      // The other release should be unaffected
      const release200Items = items.filter((i) => i.releaseId === 200);
      expect(release200Items[0].thumbUrl).toBeUndefined();
      expect(release200Items[0].lastFetched).toBeUndefined();
    });

    it('preserves purchasePrice when updating metadata', async () => {
      await addItems([
        makeItem({ releaseId: 100, dateAdded: '2025-01-01 00:00:00', purchasePrice: 29.99 }),
      ]);

      const metadata: ReleaseMetadata = {
        thumbUrl: 'https://example.com/thumb.jpg',
        lastFetched: '2025-03-29T12:00:00.000Z',
      };

      await updateReleaseMetadata(100, metadata);
      const items = await getAllItems();
      expect(items[0].purchasePrice).toBe(29.99);
      expect(items[0].thumbUrl).toBe('https://example.com/thumb.jpg');
    });
  });

  describe('getUniqueReleaseIds', () => {
    it('returns unique release IDs', async () => {
      await addItems([
        makeItem({ releaseId: 100, dateAdded: '2025-01-01 00:00:00' }),
        makeItem({ releaseId: 100, dateAdded: '2025-02-01 00:00:00' }),
        makeItem({ releaseId: 200, dateAdded: '2025-03-01 00:00:00' }),
      ]);

      const releaseIds = await getUniqueReleaseIds();
      expect(releaseIds).toHaveLength(2);
      expect(releaseIds).toContain(100);
      expect(releaseIds).toContain(200);
    });
  });

  describe('getUnfetchedReleaseIds', () => {
    it('returns only release IDs without lastFetched', async () => {
      await addItems([
        makeItem({ releaseId: 100, dateAdded: '2025-01-01 00:00:00' }),
        makeItem({ releaseId: 200, dateAdded: '2025-02-01 00:00:00' }),
      ]);

      // Mark one as fetched
      await updateReleaseMetadata(100, {
        lastFetched: '2025-03-29T12:00:00.000Z',
      });

      const unfetched = await getUnfetchedReleaseIds();
      expect(unfetched).toHaveLength(1);
      expect(unfetched).toContain(200);
    });

    it('returns empty array when all items are fetched', async () => {
      await addItems([
        makeItem({ releaseId: 100, dateAdded: '2025-01-01 00:00:00' }),
      ]);

      await updateReleaseMetadata(100, {
        lastFetched: '2025-03-29T12:00:00.000Z',
      });

      const unfetched = await getUnfetchedReleaseIds();
      expect(unfetched).toHaveLength(0);
    });
  });
});
