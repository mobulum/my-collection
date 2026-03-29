import { useState, useCallback } from 'react';
import type { ColumnKey } from '../db/types';
import { DEFAULT_VISIBLE_COLUMNS } from '../db/types';

const STORAGE_KEY = 'my-collection-visible-columns';

function loadSavedColumns(): ColumnKey[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as ColumnKey[];
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_VISIBLE_COLUMNS;
}

export function useColumnVisibility() {
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    loadSavedColumns
  );

  const toggleColumn = useCallback((column: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isColumnVisible = useCallback(
    (column: ColumnKey) => visibleColumns.includes(column),
    [visibleColumns]
  );

  return {
    visibleColumns,
    toggleColumn,
    isColumnVisible,
  };
}
