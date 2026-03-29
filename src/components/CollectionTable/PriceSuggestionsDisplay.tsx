import { useTranslation } from 'react-i18next';
import type { CollectionItem } from '../../db/types';

interface PriceSuggestionsDisplayProps {
  priceSuggestions: CollectionItem['priceSuggestions'];
  mediaCondition: CollectionItem['mediaCondition'];
}

const CONDITION_ORDER = [
  'Mint (M)',
  'Near Mint (NM or M-)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)',
];

export function PriceSuggestionsDisplay({
  priceSuggestions,
  mediaCondition,
}: PriceSuggestionsDisplayProps) {
  const { t } = useTranslation();

  if (!priceSuggestions || Object.keys(priceSuggestions).length === 0) {
    return (
      <span className="text-xs text-gray-400 italic">
        {t('discogs.noPriceSuggestions')}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
        {t('discogs.priceSuggestions')}
      </h4>
      <table className="text-xs w-full max-w-xs">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400">
            <th className="text-left py-0.5 pr-4 font-medium">
              {t('discogs.condition')}
            </th>
            <th className="text-right py-0.5 font-medium">
              {t('discogs.suggestedPrice')}
            </th>
          </tr>
        </thead>
        <tbody>
          {CONDITION_ORDER.filter(
            (condition) => priceSuggestions[condition],
          ).map((condition) => {
            const suggestion = priceSuggestions[condition];
            const isMatch = mediaCondition === condition;

            return (
              <tr
                key={condition}
                className={
                  isMatch
                    ? 'bg-blue-50 dark:bg-blue-900/30 font-semibold'
                    : ''
                }
              >
                <td className="py-0.5 pr-4 text-gray-700 dark:text-gray-300">
                  {condition}
                  {isMatch && (
                    <span className="ml-1 text-blue-600 dark:text-blue-400 text-[10px]">
                      ({t('discogs.yourCondition')})
                    </span>
                  )}
                </td>
                <td className="py-0.5 text-right text-gray-900 dark:text-gray-100">
                  {suggestion.value.toFixed(2)} {suggestion.currency}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
