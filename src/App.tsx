import { useTranslation } from 'react-i18next';
import { Layout } from './components/Layout/Layout';
import { CSVImportButton } from './components/CSVImport/CSVImportButton';
import { SearchBar } from './components/CollectionTable/SearchBar';
import { ColumnSelector } from './components/CollectionTable/ColumnSelector';
import { CollectionTable } from './components/CollectionTable/CollectionTable';
import { DiscogsTokenInput } from './components/DiscogsSettings/DiscogsTokenInput';
import { useCollection } from './hooks/useCollection';
import { useColumnVisibility } from './hooks/useColumnVisibility';
import { useDiscogsAuth } from './hooks/useDiscogsAuth';
import { useDiscogsFetch } from './hooks/useDiscogsFetch';

function App() {
  const { t } = useTranslation();

  const {
    items,
    totalCount,
    filteredCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    handleUpdatePrice,
    refreshItems,
    priceTotal,
  } = useCollection();

  const { visibleColumns, toggleColumn, isColumnVisible } =
    useColumnVisibility();

  const {
    consumerKey,
    consumerSecret,
    hasCredentials,
    isAuthenticated,
    isOAuthComplete,
    isOAuthLoading,
    credentials,
    saveCredentials,
    clearCredentials,
    startOAuth,
    disconnect,
  } = useDiscogsAuth();

  const { progress, fetchAll, fetchSingle, cancel } = useDiscogsFetch(
    credentials,
    refreshItems,
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 mt-4">
        {/* Toolbar row 1: Import, Search, Columns */}
        <div className="flex flex-wrap items-center gap-3">
          <CSVImportButton onImportComplete={refreshItems} />
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <ColumnSelector
            isColumnVisible={isColumnVisible}
            toggleColumn={toggleColumn}
          />
        </div>

        {/* Toolbar row 2: Discogs API integration */}
        <div className="flex flex-wrap items-center gap-3">
          <DiscogsTokenInput
            consumerKey={consumerKey}
            consumerSecret={consumerSecret}
            hasCredentials={hasCredentials}
            isOAuthComplete={isOAuthComplete}
            isOAuthLoading={isOAuthLoading}
            onSaveCredentials={saveCredentials}
            onClearCredentials={clearCredentials}
            onStartOAuth={startOAuth}
            onDisconnect={disconnect}
          />

          {isAuthenticated && totalCount > 0 && (
            <>
              {!progress.isRunning ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAll(true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {t('discogs.fetchAll')}
                  </button>
                  <button
                    onClick={() => fetchAll(false)}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    {t('discogs.refetchAll')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress.rateLimitWait
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${progress.total > 0 ? ((progress.completed + progress.errors) / progress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                      {progress.completed + progress.errors}/{progress.total}
                      {progress.errors > 0 && (
                        <span className="text-red-500 ml-1">
                          ({progress.errors} {t('discogs.errors')})
                        </span>
                      )}
                    </span>
                  </div>

                  {progress.rateLimitWait && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                      {t('discogs.rateLimitWait', {
                        seconds: progress.rateLimitWait.waitSeconds,
                        attempt: progress.rateLimitWait.attempt,
                        maxRetries: progress.rateLimitWait.maxRetries,
                      })}
                    </span>
                  )}

                  <button
                    onClick={cancel}
                    className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    {t('discogs.cancelFetch')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {t('table.totalItems', {
              count: searchQuery ? filteredCount : totalCount,
            })}
          </span>
          {priceTotal > 0 && (
            <span>
              {t('table.priceTotal', { total: priceTotal.toFixed(2) })}
            </span>
          )}
        </div>

        {/* Table or empty state */}
        {totalCount > 0 && filteredCount === 0 && searchQuery ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('table.noResults')}
          </div>
        ) : (
          <CollectionTable
            items={items}
            visibleColumns={visibleColumns}
            sortConfig={sortConfig}
            onSort={handleSort}
            onUpdatePrice={handleUpdatePrice}
            onFetchSingle={fetchSingle}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>
    </Layout>
  );
}

export default App;
