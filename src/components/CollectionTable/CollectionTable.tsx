import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CollectionItem,
  ColumnKey,
  SortConfig,
  SortField,
} from '../../db/types';
import { SortableHeader } from './SortableHeader';
import { CollectionRow } from './CollectionRow';

const SORTABLE_FIELDS: SortField[] = [
  'collectionFolder',
  'artist',
  'title',
  'dateAdded',
  'purchasePrice',
];

interface CollectionTableProps {
  items: CollectionItem[];
  visibleColumns: ColumnKey[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onUpdatePrice: (id: number, price: number | null) => void;
  onFetchSingle: (releaseId: number) => Promise<void>;
  isAuthenticated: boolean;
}

export function CollectionTable({
  items,
  visibleColumns,
  sortConfig,
  onSort,
  onUpdatePrice,
  onFetchSingle,
  isAuthenticated,
}: CollectionTableProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('table.noData')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        data-testid="collection-table"
      >
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
            {visibleColumns.map((column) =>
              SORTABLE_FIELDS.includes(column as SortField) ? (
                <SortableHeader
                  key={column}
                  field={column as SortField}
                  sortConfig={sortConfig}
                  onSort={onSort}
                >
                  {t(`columns.${column}`)}
                </SortableHeader>
              ) : (
                <th
                  key={column}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {t(`columns.${column}`)}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CollectionRow
              key={item.id}
              item={item}
              visibleColumns={visibleColumns}
              onUpdatePrice={onUpdatePrice}
              isExpanded={expandedId === item.id}
              onToggleExpand={() => toggleExpand(item.id!)}
              onFetchSingle={onFetchSingle}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
