import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CollectionItem } from '../../db/types';
import { PriceSuggestionsDisplay } from './PriceSuggestionsDisplay';

interface ExpandedDetailsProps {
  item: CollectionItem;
  colSpan: number;
  onFetchSingle: (releaseId: number) => Promise<void>;
  isAuthenticated: boolean;
}

export function ExpandedDetails({
  item,
  colSpan,
  onFetchSingle,
  isAuthenticated,
}: ExpandedDetailsProps) {
  const { t } = useTranslation();
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      await onFetchSingle(item.releaseId);
    } catch {
      setFetchError(t('discogs.fetchError'));
    } finally {
      setIsFetching(false);
    }
  };

  const hasFetched = !!item.lastFetched;

  return (
    <tr className="bg-gray-50 dark:bg-gray-800/80">
      <td colSpan={colSpan} className="px-4 py-4">
        {!hasFetched && !isAuthenticated && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            {t('discogs.tokenRequired')}
          </div>
        )}

        {!hasFetched && isAuthenticated && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('discogs.notFetched')}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isFetching ? t('discogs.fetching') : t('discogs.fetchNow')}
            </button>
            {fetchError && (
              <span className="text-xs text-red-500">{fetchError}</span>
            )}
          </div>
        )}

        {hasFetched && (
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
            {/* Cover art */}
            <div className="flex flex-col items-center gap-2">
              {item.coverUrl ? (
                <img
                  src={item.coverUrl}
                  alt={`${item.artist} - ${item.title}`}
                  className="w-48 h-48 object-cover rounded shadow-md"
                  loading="lazy"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
                  <svg
                    className="w-12 h-12"
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
              )}

              {/* Discogs link + refresh */}
              <div className="flex items-center gap-2">
                {item.discogsUrl && (
                  <a
                    href={item.discogsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('discogs.viewOnDiscogs')}
                  </a>
                )}
                {isAuthenticated && (
                  <button
                    onClick={handleRefresh}
                    disabled={isFetching}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                    title={t('discogs.refresh')}
                  >
                    {isFetching ? '...' : '\u21BB'}
                  </button>
                )}
              </div>
              {fetchError && (
                <span className="text-xs text-red-500">{fetchError}</span>
              )}
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left column: basic metadata */}
              <div className="space-y-3">
                {/* Genres & Styles */}
                {item.genres && item.genres.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                      {t('discogs.genres')}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {item.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.styles && item.styles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                      {t('discogs.styles')}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {item.styles.map((style) => (
                        <span
                          key={style}
                          className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded-full"
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Year & Country */}
                <div className="flex gap-4">
                  {item.year && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t('discogs.year')}
                      </h4>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {item.year}
                      </span>
                    </div>
                  )}
                  {item.country && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                        {t('discogs.country')}
                      </h4>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {item.country}
                      </span>
                    </div>
                  )}
                </div>

                {/* Community stats */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                    {t('discogs.communityStats')}
                  </h4>
                  <div className="flex gap-4 text-sm">
                    {item.communityHave !== undefined && (
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{item.communityHave}</span>{' '}
                        {t('discogs.have')}
                      </span>
                    )}
                    {item.communityWant !== undefined && (
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{item.communityWant}</span>{' '}
                        {t('discogs.want')}
                      </span>
                    )}
                    {item.communityRating !== undefined && (
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">
                          {item.communityRating.toFixed(2)}
                        </span>{' '}
                        {t('discogs.rating')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Marketplace */}
                {(item.lowestPrice !== undefined ||
                  item.numForSale !== undefined) && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                      {t('discogs.marketplace')}
                    </h4>
                    <div className="flex gap-4 text-sm">
                      {item.lowestPrice !== undefined && (
                        <span className="text-gray-700 dark:text-gray-300">
                          {t('discogs.lowestPrice')}:{' '}
                          <span className="font-medium">
                            {item.lowestPrice.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {item.numForSale !== undefined && (
                        <span className="text-gray-700 dark:text-gray-300">
                          {t('discogs.forSale')}:{' '}
                          <span className="font-medium">{item.numForSale}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: tracklist + price suggestions */}
              <div className="space-y-3">
                {/* Tracklist */}
                {item.tracklist && item.tracklist.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                      {t('discogs.tracklist')}
                    </h4>
                    <ol className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
                      {item.tracklist.map((track, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between text-gray-700 dark:text-gray-300 py-0.5"
                        >
                          <span>
                            <span className="text-gray-400 dark:text-gray-500 w-8 inline-block">
                              {track.position || `${idx + 1}`}
                            </span>{' '}
                            {track.title}
                          </span>
                          {track.duration && (
                            <span className="text-gray-400 dark:text-gray-500 ml-2 tabular-nums">
                              {track.duration}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Price suggestions */}
                <PriceSuggestionsDisplay
                  priceSuggestions={item.priceSuggestions}
                  mediaCondition={item.mediaCondition}
                />
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
