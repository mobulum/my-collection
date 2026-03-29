import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { CollectionTable } from '../src/components/CollectionTable/CollectionTable';
import type { CollectionItem, SortConfig } from '../src/db/types';

const mockItems: CollectionItem[] = [
  {
    id: 1,
    catalogNumber: '123',
    artist: 'Metallica',
    title: 'Master Of Puppets',
    label: 'Blackened',
    format: 'LP, Album',
    rating: '',
    released: '2017',
    releaseId: 11129661,
    collectionFolder: 'New (no unboxed)',
    dateAdded: '2025-10-30 08:57:34',
    mediaCondition: 'Mint (M)',
    sleeveCondition: 'Mint (M)',
    collectionNotes: '',
    purchasePrice: 99.99,
  },
  {
    id: 2,
    catalogNumber: '456',
    artist: 'Iron Maiden',
    title: 'Powerslave',
    label: 'EMI',
    format: 'CD, Album',
    rating: '',
    released: '1998',
    releaseId: 4634626,
    collectionFolder: 'Uncategorized',
    dateAdded: '2025-02-19 07:49:01',
    mediaCondition: 'Very Good (VG)',
    sleeveCondition: 'Good (G)',
    collectionNotes: '',
    purchasePrice: null,
  },
];

const defaultSortConfig: SortConfig = {
  field: 'dateAdded',
  direction: 'desc',
};

const defaultVisibleColumns = [
  'artist' as const,
  'title' as const,
  'format' as const,
  'collectionFolder' as const,
  'dateAdded' as const,
  'mediaCondition' as const,
  'sleeveCondition' as const,
  'purchasePrice' as const,
];

function renderTable(
  items: CollectionItem[] = mockItems,
  sortConfig: SortConfig = defaultSortConfig,
  onSort = jest.fn(),
  onUpdatePrice = jest.fn(),
  onFetchSingle = jest.fn().mockResolvedValue(undefined),
  isAuthenticated = false,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <CollectionTable
        items={items}
        visibleColumns={defaultVisibleColumns}
        sortConfig={sortConfig}
        onSort={onSort}
        onUpdatePrice={onUpdatePrice}
        onFetchSingle={onFetchSingle}
        isAuthenticated={isAuthenticated}
      />
    </I18nextProvider>,
  );
}

describe('CollectionTable', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders table with items', () => {
    renderTable();

    expect(screen.getByTestId('collection-table')).toBeInTheDocument();
    expect(screen.getByText('Metallica')).toBeInTheDocument();
    expect(screen.getByText('Master Of Puppets')).toBeInTheDocument();
    expect(screen.getByText('Iron Maiden')).toBeInTheDocument();
    expect(screen.getByText('Powerslave')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderTable();

    expect(screen.getByText('Artist')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Folder')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    renderTable([]);

    expect(screen.getByText(/no items in collection/i)).toBeInTheDocument();
  });

  it('calls onSort when clicking sortable header', () => {
    const onSort = jest.fn();
    renderTable(mockItems, defaultSortConfig, onSort);

    fireEvent.click(screen.getByText('Artist'));
    expect(onSort).toHaveBeenCalledWith('artist');
  });

  it('renders purchase price input', () => {
    renderTable();

    const priceInputs = screen.getAllByTestId('purchase-price-input');
    expect(priceInputs).toHaveLength(2);
    expect(priceInputs[0]).toHaveValue('99.99');
    expect(priceInputs[1]).toHaveValue('');
  });

  it('renders media condition values', () => {
    renderTable();

    const mintElements = screen.getAllByText('Mint (M)');
    expect(mintElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Very Good (VG)')).toBeInTheDocument();
    expect(screen.getByText('Good (G)')).toBeInTheDocument();
  });
});
