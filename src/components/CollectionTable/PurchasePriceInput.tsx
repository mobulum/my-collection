import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface PurchasePriceInputProps {
  value: number | null;
  onSave: (price: number | null) => void;
}

export function PurchasePriceInput({ value, onSave }: PurchasePriceInputProps) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(
    value !== null ? value.toString() : ''
  );
  const [isDirty, setIsDirty] = useState(false);

  const save = useCallback(() => {
    if (!isDirty) return;
    const trimmed = localValue.trim();
    if (trimmed === '') {
      onSave(null);
    } else {
      const parsed = parseFloat(trimmed.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0) {
        onSave(parsed);
      }
    }
    setIsDirty(false);
  }, [localValue, isDirty, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      save();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        setIsDirty(true);
      }}
      onBlur={save}
      onKeyDown={handleKeyDown}
      placeholder={t('price.placeholder')}
      className="w-20 px-2 py-1 text-sm text-right border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none rounded bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      data-testid="purchase-price-input"
    />
  );
}
