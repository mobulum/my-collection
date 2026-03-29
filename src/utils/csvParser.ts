import Papa from 'papaparse';
import type { CollectionItem, CSVRow } from '../db/types';
import {
  type MediaCondition,
  type SleeveCondition,
  MEDIA_CONDITION_VALUES,
  SLEEVE_CONDITION_VALUES,
} from '../db/types';

export function parseMediaCondition(value: string): CollectionItem['mediaCondition'] {
  const trimmed = value.trim();
  if (MEDIA_CONDITION_VALUES.includes(trimmed)) {
    return trimmed as MediaCondition;
  }
  return '';
}

export function parseSleeveCondition(value: string): CollectionItem['sleeveCondition'] {
  const trimmed = value.trim();
  if (SLEEVE_CONDITION_VALUES.includes(trimmed)) {
    return trimmed as SleeveCondition;
  }
  return '';
}

export function mapCSVRowToItem(row: CSVRow): Omit<CollectionItem, 'id'> {
  return {
    catalogNumber: (row['Catalog#'] ?? '').trim(),
    artist: (row['Artist'] ?? '').trim(),
    title: (row['Title'] ?? '').trim(),
    label: (row['Label'] ?? '').trim(),
    format: (row['Format'] ?? '').trim(),
    rating: (row['Rating'] ?? '').trim(),
    released: (row['Released'] ?? '').trim(),
    releaseId: parseInt(row['release_id'] ?? '0', 10) || 0,
    collectionFolder: (row['CollectionFolder'] ?? '').trim(),
    dateAdded: (row['Date Added'] ?? '').trim(),
    mediaCondition: parseMediaCondition(row['Collection Media Condition'] ?? ''),
    sleeveCondition: parseSleeveCondition(row['Collection Sleeve Condition'] ?? ''),
    collectionNotes: (row['Collection Notes'] ?? '').trim(),
    purchasePrice: null,
  };
}

export function parseCSV(csvText: string): Omit<CollectionItem, 'id'>[] {
  const result = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  if (result.errors.length > 0) {
    const criticalErrors = result.errors.filter(
      (e) => e.type !== 'FieldMismatch'
    );
    if (criticalErrors.length > 0) {
      throw new Error(
        `CSV parsing errors: ${criticalErrors.map((e) => e.message).join(', ')}`
      );
    }
  }

  return result.data
    .filter((row) => row['release_id'] && row['release_id'].trim() !== '')
    .map(mapCSVRowToItem);
}
