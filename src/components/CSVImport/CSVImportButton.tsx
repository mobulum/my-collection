import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCSVImport } from '../../hooks/useCSVImport';

interface CSVImportButtonProps {
  onImportComplete: () => void;
}

export function CSVImportButton({ onImportComplete }: CSVImportButtonProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isImporting, result, error, importFile, clearStatus } =
    useCSVImport(onImportComplete);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        data-testid="csv-file-input"
      />
      <button
        onClick={handleClick}
        disabled={isImporting}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm font-medium"
      >
        {isImporting ? t('actions.importing') : t('actions.importCSV')}
      </button>
      {result && (
        <span
          className="text-sm text-green-600 dark:text-green-400 cursor-pointer"
          onClick={clearStatus}
          role="status"
        >
          {t('import.success', { added: result.added, skipped: result.skipped })}
        </span>
      )}
      {error && (
        <span
          className="text-sm text-red-600 dark:text-red-400 cursor-pointer"
          onClick={clearStatus}
          role="alert"
        >
          {error === 'noData'
            ? t('import.noData')
            : t('import.error', { message: error })}
        </span>
      )}
    </div>
  );
}
