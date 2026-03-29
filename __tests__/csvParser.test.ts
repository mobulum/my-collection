import { parseCSV, mapCSVRowToItem, parseMediaCondition, parseSleeveCondition } from '../src/utils/csvParser';
import type { CSVRow } from '../src/db/types';

describe('csvParser', () => {
  describe('parseMediaCondition', () => {
    it('parses valid media condition', () => {
      expect(parseMediaCondition('Mint (M)')).toBe('Mint (M)');
      expect(parseMediaCondition('Near Mint (NM or M-)')).toBe('Near Mint (NM or M-)');
      expect(parseMediaCondition('Very Good Plus (VG+)')).toBe('Very Good Plus (VG+)');
      expect(parseMediaCondition('Very Good (VG)')).toBe('Very Good (VG)');
      expect(parseMediaCondition('Good Plus (G+)')).toBe('Good Plus (G+)');
      expect(parseMediaCondition('Good (G)')).toBe('Good (G)');
      expect(parseMediaCondition('Fair (F)')).toBe('Fair (F)');
      expect(parseMediaCondition('Poor (P)')).toBe('Poor (P)');
    });

    it('returns empty string for invalid media condition', () => {
      expect(parseMediaCondition('')).toBe('');
      expect(parseMediaCondition('Unknown')).toBe('');
      expect(parseMediaCondition('mint')).toBe('');
    });

    it('trims whitespace', () => {
      expect(parseMediaCondition('  Mint (M)  ')).toBe('Mint (M)');
    });
  });

  describe('parseSleeveCondition', () => {
    it('parses valid sleeve condition', () => {
      expect(parseSleeveCondition('Mint (M)')).toBe('Mint (M)');
      expect(parseSleeveCondition('Fair (F)')).toBe('Fair (F)');
    });

    it('returns empty string for invalid sleeve condition', () => {
      expect(parseSleeveCondition('')).toBe('');
      expect(parseSleeveCondition('Bad')).toBe('');
    });
  });

  describe('mapCSVRowToItem', () => {
    it('maps CSV row to CollectionItem correctly', () => {
      const row: CSVRow = {
        'Catalog#': '123-456',
        Artist: 'Metallica',
        Title: 'Master Of Puppets',
        Label: 'Blackened',
        Format: 'LP, Album, RE',
        Rating: '5',
        Released: '2017',
        release_id: '11129661',
        CollectionFolder: 'New (no unboxed)',
        'Date Added': '2025-10-30 08:57:34',
        'Collection Media Condition': 'Mint (M)',
        'Collection Sleeve Condition': 'Mint (M)',
        'Collection Notes': 'Great album',
      };

      const item = mapCSVRowToItem(row);

      expect(item.catalogNumber).toBe('123-456');
      expect(item.artist).toBe('Metallica');
      expect(item.title).toBe('Master Of Puppets');
      expect(item.label).toBe('Blackened');
      expect(item.format).toBe('LP, Album, RE');
      expect(item.rating).toBe('5');
      expect(item.released).toBe('2017');
      expect(item.releaseId).toBe(11129661);
      expect(item.collectionFolder).toBe('New (no unboxed)');
      expect(item.dateAdded).toBe('2025-10-30 08:57:34');
      expect(item.mediaCondition).toBe('Mint (M)');
      expect(item.sleeveCondition).toBe('Mint (M)');
      expect(item.collectionNotes).toBe('Great album');
      expect(item.purchasePrice).toBeNull();
    });

    it('handles missing/empty fields', () => {
      const row: CSVRow = {
        'Catalog#': '',
        Artist: '',
        Title: '',
        Label: '',
        Format: '',
        Rating: '',
        Released: '',
        release_id: '0',
        CollectionFolder: '',
        'Date Added': '',
        'Collection Media Condition': '',
        'Collection Sleeve Condition': '',
        'Collection Notes': '',
      };

      const item = mapCSVRowToItem(row);

      expect(item.catalogNumber).toBe('');
      expect(item.artist).toBe('');
      expect(item.releaseId).toBe(0);
      expect(item.mediaCondition).toBe('');
      expect(item.sleeveCondition).toBe('');
      expect(item.purchasePrice).toBeNull();
    });
  });

  describe('parseCSV', () => {
    it('parses valid CSV text', () => {
      const csv = `Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes
123,Metallica,Black Album,Vertigo,"CD, Album",,1991,5607022,Uncategorized,2025-02-23 08:42:25,Mint (M),Mint (M),`;

      const items = parseCSV(csv);

      expect(items).toHaveLength(1);
      expect(items[0].artist).toBe('Metallica');
      expect(items[0].title).toBe('Black Album');
      expect(items[0].releaseId).toBe(5607022);
      expect(items[0].mediaCondition).toBe('Mint (M)');
    });

    it('parses multiple rows', () => {
      const csv = `Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes
123,Metallica,Black Album,Vertigo,"CD, Album",,1991,5607022,Uncategorized,2025-02-23 08:42:25,,,
456,Iron Maiden,Powerslave,EMI,"CD, Album",,1998,4634626,Uncategorized,2025-02-19 07:49:01,,,`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(2);
      expect(items[0].artist).toBe('Metallica');
      expect(items[1].artist).toBe('Iron Maiden');
    });

    it('skips rows without release_id', () => {
      const csv = `Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes
123,Metallica,Black Album,Vertigo,"CD, Album",,1991,5607022,Uncategorized,2025-02-23 08:42:25,,,
456,Bad Entry,No ID,Label,CD,,2000,,Uncategorized,2025-01-01 00:00:00,,,`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(1);
      expect(items[0].artist).toBe('Metallica');
    });

    it('handles CSV with quoted fields containing commas', () => {
      const csv = `Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes
"501137 2, COL 501137 2",Roger Waters,In The Flesh,"Columbia, Columbia","2xCD, Album",,2000,770499,Uncategorized,2025-02-19 07:59:46,,,`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(1);
      expect(items[0].catalogNumber).toBe('501137 2, COL 501137 2');
      expect(items[0].label).toBe('Columbia, Columbia');
    });

    it('returns empty array for empty CSV', () => {
      const csv = `Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes`;

      const items = parseCSV(csv);
      expect(items).toHaveLength(0);
    });
  });
});
