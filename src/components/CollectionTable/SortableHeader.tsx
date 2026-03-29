import { useTranslation } from 'react-i18next';
import type { SortConfig, SortField } from '../../db/types';

interface SortableHeaderProps {
  field: SortField;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

export function SortableHeader({
  field,
  sortConfig,
  onSort,
  children,
}: SortableHeaderProps) {
  const { t } = useTranslation();

  const isActive = sortConfig.field === field;
  const direction = isActive ? sortConfig.direction : null;

  const getAriaLabel = () => {
    if (!isActive) return t('sort.ascending');
    if (direction === 'asc') return t('sort.descending');
    return t('sort.none');
  };

  return (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none whitespace-nowrap"
      onClick={() => onSort(field)}
      aria-label={getAriaLabel()}
      aria-sort={
        isActive
          ? direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <span className="flex items-center gap-1">
        {children}
        <span className="inline-flex flex-col text-[10px] leading-none">
          <span
            className={
              isActive && direction === 'asc'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-300 dark:text-gray-600'
            }
          >
            ▲
          </span>
          <span
            className={
              isActive && direction === 'desc'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-300 dark:text-gray-600'
            }
          >
            ▼
          </span>
        </span>
      </span>
    </th>
  );
}
