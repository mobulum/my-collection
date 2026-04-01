import { useTranslation } from 'react-i18next';
import type { CollectionItem, ColumnKey } from '../../db/types';
import { PurchasePriceInput } from './PurchasePriceInput';
import { ExpandedDetails } from './ExpandedDetails';
import { formatDate, normalizeFormat } from '../../utils/formatters';

interface CollectionRowProps {
  item: CollectionItem;
  visibleColumns: ColumnKey[];
  onUpdatePrice: (id: number, price: number | null) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onFetchSingle: (releaseId: number) => Promise<void>;
  isAuthenticated: boolean;
}

export function CollectionRow({
  item,
  visibleColumns,
  onUpdatePrice,
  isExpanded,
  onToggleExpand,
  onFetchSingle,
  isAuthenticated,
}: CollectionRowProps) {
  const { i18n } = useTranslation();

  const renderCell = (column: ColumnKey) => {
    switch (column) {
      case 'purchasePrice':
        return (
          <PurchasePriceInput
            value={item.purchasePrice}
            onSave={(price) => onUpdatePrice(item.id!, price)}
          />
        );
      case 'dateAdded':
        return (
          <span className="whitespace-nowrap">
            {formatDate(item.dateAdded, i18n.language)}
          </span>
        );
      case 'thumbUrl':
        return item.thumbUrl ? (
          <img
            src={item.thumbUrl}
            alt={`${item.artist} - ${item.title}`}
            className="w-10 h-10 object-cover rounded"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-300 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        );
      case 'genres':
        return (
          <span className="line-clamp-1 text-xs">
            {Array.isArray(item.genres) ? item.genres.join(', ') : ''}
          </span>
        );
      case 'styles':
        return (
          <span className="line-clamp-1 text-xs">
            {Array.isArray(item.styles) ? item.styles.join(', ') : ''}
          </span>
        );
      case 'lowestPrice':
        return (
          <span className="whitespace-nowrap tabular-nums">
            {item.lowestPrice != null ? item.lowestPrice.toFixed(2) : ''}
          </span>
        );
      case 'communityRating':
        return (
          <span className="whitespace-nowrap tabular-nums">
            {item.communityRating != null
              ? item.communityRating.toFixed(2)
              : ''}
          </span>
        );
      case 'format':
        return (
          <span className="whitespace-nowrap font-medium">
            {normalizeFormat(item.format)}
          </span>
        );
      case 'suggestedPrice': {
        const condition = item.mediaCondition;
        const suggestion = condition
          ? item.priceSuggestions?.[condition]
          : undefined;
        return (
          <span className="whitespace-nowrap tabular-nums">
            {suggestion
              ? `${suggestion.value.toFixed(2)} ${suggestion.currency}`
              : ''}
          </span>
        );
      }
      default:
        return (
          <span className="line-clamp-2">
            {String(item[column] ?? '')}
          </span>
        );
    }
  };

  return (
    <>
      <tr
        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
          isExpanded
            ? 'bg-blue-50/50 dark:bg-blue-900/20'
            : ''
        }`}
        onClick={onToggleExpand}
      >
        {visibleColumns.map((column) => (
          <td
            key={column}
            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
            onClick={
              column === 'purchasePrice'
                ? (e) => e.stopPropagation()
                : undefined
            }
          >
            {renderCell(column)}
          </td>
        ))}
      </tr>
      {isExpanded && (
        <ExpandedDetails
          item={item}
          colSpan={visibleColumns.length}
          onFetchSingle={onFetchSingle}
           isAuthenticated={isAuthenticated}
        />
      )}
    </>
  );
}
