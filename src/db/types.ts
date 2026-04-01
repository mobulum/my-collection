export const MediaCondition = {
  Mint: 'Mint (M)',
  NearMint: 'Near Mint (NM or M-)',
  VeryGoodPlus: 'Very Good Plus (VG+)',
  VeryGood: 'Very Good (VG)',
  GoodPlus: 'Good Plus (G+)',
  Good: 'Good (G)',
  Fair: 'Fair (F)',
  Poor: 'Poor (P)',
} as const;

export type MediaCondition =
  (typeof MediaCondition)[keyof typeof MediaCondition];

export const SleeveCondition = {
  Mint: 'Mint (M)',
  NearMint: 'Near Mint (NM or M-)',
  VeryGoodPlus: 'Very Good Plus (VG+)',
  VeryGood: 'Very Good (VG)',
  GoodPlus: 'Good Plus (G+)',
  Good: 'Good (G)',
  Fair: 'Fair (F)',
  Poor: 'Poor (P)',
} as const;

export type SleeveCondition =
  (typeof SleeveCondition)[keyof typeof SleeveCondition];

export const MEDIA_CONDITION_VALUES: readonly string[] =
  Object.values(MediaCondition);
export const SLEEVE_CONDITION_VALUES: readonly string[] =
  Object.values(SleeveCondition);

export interface TracklistItem {
  position: string;
  title: string;
  duration: string;
}

export interface PriceSuggestion {
  currency: string;
  value: number;
}

export interface CollectionItem {
  id?: number;
  catalogNumber: string;
  artist: string;
  title: string;
  label: string;
  format: string;
  rating: string;
  released: string;
  releaseId: number;
  collectionFolder: string;
  dateAdded: string;
  mediaCondition: MediaCondition | '';
  sleeveCondition: SleeveCondition | '';
  collectionNotes: string;
  purchasePrice: number | null;
  // Discogs API metadata (optional - populated by API fetch)
  thumbUrl?: string;
  coverUrl?: string;
  genres?: string[];
  styles?: string[];
  year?: number;
  country?: string;
  tracklist?: TracklistItem[];
  lowestPrice?: number;
  numForSale?: number;
  communityHave?: number;
  communityWant?: number;
  communityRating?: number;
  priceSuggestions?: Record<string, PriceSuggestion>;
  discogsUrl?: string;
  lastFetched?: string;
}

export type SortField =
  | 'dateAdded'
  | 'collectionFolder'
  | 'artist'
  | 'title'
  | 'purchasePrice'
  | 'suggestedPrice';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export type ColumnKey = keyof Omit<
  CollectionItem,
  | 'id'
  | 'coverUrl'
  | 'tracklist'
  | 'priceSuggestions'
  | 'lastFetched'
  | 'discogsUrl'
> | 'suggestedPrice';

export const ALL_COLUMNS: ColumnKey[] = [
  'thumbUrl',
  'catalogNumber',
  'artist',
  'title',
  'label',
  'format',
  'rating',
  'released',
  'releaseId',
  'collectionFolder',
  'dateAdded',
  'mediaCondition',
  'sleeveCondition',
  'collectionNotes',
  'purchasePrice',
  'suggestedPrice',
  'year',
  'country',
  'genres',
  'styles',
  'lowestPrice',
  'numForSale',
  'communityHave',
  'communityWant',
  'communityRating',
];

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'thumbUrl',
  'artist',
  'title',
  'collectionFolder',
  'dateAdded',
  'mediaCondition',
  'sleeveCondition',
  'purchasePrice',
  'suggestedPrice',
];

export interface CSVRow {
  'Catalog#': string;
  Artist: string;
  Title: string;
  Label: string;
  Format: string;
  Rating: string;
  Released: string;
  release_id: string;
  CollectionFolder: string;
  'Date Added': string;
  'Collection Media Condition': string;
  'Collection Sleeve Condition': string;
  'Collection Notes': string;
}
