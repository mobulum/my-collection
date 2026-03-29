import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnKey } from '../../db/types';
import { ALL_COLUMNS } from '../../db/types';

interface ColumnSelectorProps {
  isColumnVisible: (column: ColumnKey) => boolean;
  toggleColumn: (column: ColumnKey) => void;
}

export function ColumnSelector({
  isColumnVisible,
  toggleColumn,
}: ColumnSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        {t('actions.columns')}
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 min-w-48">
            {ALL_COLUMNS.map((column) => (
              <label
                key={column}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={isColumnVisible(column)}
                  onChange={() => toggleColumn(column)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {t(`columns.${column}`)}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
