import { useState, useCallback } from 'react';
import { parseCSV } from '../utils/csvParser';
import { addItems } from '../db/operations';

interface ImportResult {
  added: number;
  skipped: number;
}

export function useCSVImport(onImportComplete: () => void) {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFile = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setResult(null);
      setError(null);

      try {
        const text = await file.text();
        const items = parseCSV(text);

        if (items.length === 0) {
          setError('noData');
          return;
        }

        const importResult = await addItems(items);
        setResult(importResult);
        onImportComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsImporting(false);
      }
    },
    [onImportComplete]
  );

  const clearStatus = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isImporting,
    result,
    error,
    importFile,
    clearStatus,
  };
}
