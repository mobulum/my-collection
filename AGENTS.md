# AGENTS.md

Guidelines for AI agents working in this repository.

## Build / Lint / Test Commands

```bash
npm run build          # tsc -b && vite build (type-check + bundle)
npm run lint           # eslint . (flat config, ESM)
npm test               # run all tests (Jest 30 with --experimental-vm-modules)
npm run test:watch     # run tests in watch mode

# Run a single test file
node --experimental-vm-modules node_modules/.bin/jest __tests__/discogsApi.test.ts
# Run a single test by name
node --experimental-vm-modules node_modules/.bin/jest -t "maps release data to metadata"

# Type-check only (no emit)
npx tsc --noEmit -p tsconfig.app.json
```

CI pipeline runs: lint -> test -> build (Node 22).

## Tech Stack

- React 19 + TypeScript 5.9 + Vite 8 + TailwindCSS 4
- Dexie.js (IndexedDB), PapaParse, react-i18next
- Jest 30 + ts-jest + @testing-library/react + fake-indexeddb
- ESLint 9 flat config (no Prettier)
- Package type: `"module"` (ESM)
- Deployment: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)

## TypeScript Constraints

- `erasableSyntaxOnly: true` in tsconfig.app.json — **no runtime `enum` syntax, no `public`/`private`/`protected` constructor parameter properties**. Use `as const` objects with derived union types instead of enums. Use explicit property declarations in classes.
- `verbatimModuleSyntax: true` — always use `import type { X }` for type-only imports.
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- Test tsconfig (`tsconfig.test.json`) disables `verbatimModuleSyntax` and enables `esModuleInterop`.

## Code Style

### Formatting
- 2-space indentation, single quotes, semicolons always, trailing commas in multi-line.
- No Prettier config — follow existing formatting conventions.

### Imports
1. React / external library imports first
2. Internal module imports second (relative paths)
3. Side-effect imports last
- Use `import type { X }` for type-only imports (required by `verbatimModuleSyntax`).
- Mixed: `import { type Foo, BAR_VALUE } from './module'`.

### Naming
- **Files:** `PascalCase.tsx` for React components, `camelCase.ts` for everything else.
- **Components:** Named function declarations (`export function MyComponent() {}`), not arrow functions. No `React.FC`.
- **Hooks:** `camelCase` prefixed with `use` (e.g., `useCollection`).
- **Interfaces:** PascalCase. Component props suffixed with `Props` (e.g., `SearchBarProps`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `BASE_URL`, `MAX_RETRIES`).
- **Enums:** `as const` object + derived union type, not TypeScript `enum`.

### Exports
- Named exports everywhere. `export default` only in `App.tsx` and `i18n/index.ts`.
- No barrel files (`index.ts`) — import from specific file paths.

### Components
- Props interface defined in the same file, directly above the component.
- Hooks at the top of the component body.
- Use `data-testid` attributes for testable elements.
- All styling via Tailwind utility classes (no custom CSS). Support dark mode with `dark:` variants.
- All user-facing strings use `t()` from `useTranslation()` (i18n keys in `src/i18n/en.json` + `pl.json`).

### Error Handling
- `try/catch/finally` in async functions with `console.error`/`console.warn`.
- Custom error class: `DiscogsApiError` with `status` and `releaseId` properties.
- `instanceof` checks for error discrimination.
- Generic catch: `err instanceof Error ? err.message : 'Unknown error'`.
- Empty `catch {}` with comment for non-critical failures (localStorage, etc.).
- Swallowed errors must have a comment explaining why.

### State Management
- React hooks only (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`). No external state libraries.
- Custom hooks encapsulate all business logic. Components are pure UI.
- localStorage for preferences (column visibility, Discogs credentials).
- Dexie (IndexedDB) for collection data.
- `AbortController` for cancellable fetch operations.

## Column System

### Types (`src/db/types.ts`)
- **`ColumnKey`** — union of all displayable `CollectionItem` keys (excluding `id`, `coverUrl`, `tracklist`, `priceSuggestions`, `lastFetched`, `discogsUrl`) plus the virtual column `'suggestedPrice'`.
- **`SortField`** — union: `'dateAdded' | 'collectionFolder' | 'artist' | 'title' | 'format' | 'purchasePrice' | 'suggestedPrice'`.
- **`ALL_COLUMNS`** — 25 columns in display order.
- **`DEFAULT_VISIBLE_COLUMNS`** — 10 columns: `thumbUrl`, `artist`, `title`, `format`, `collectionFolder`, `dateAdded`, `mediaCondition`, `sleeveCondition`, `purchasePrice`, `suggestedPrice`.

### Sortable fields (`src/components/CollectionTable/CollectionTable.tsx`)
`SORTABLE_FIELDS`: `collectionFolder`, `artist`, `title`, `format`, `dateAdded`, `purchasePrice`, `suggestedPrice`. Default sort: `dateAdded desc`.

### Virtual column: `suggestedPrice`
Not stored in DB. Computed at render time from `item.priceSuggestions[item.mediaCondition]`. Displays `value.toFixed(2) + currency`. Sort uses numeric comparison with nulls pushed to bottom.

### Format normalization (`src/utils/formatters.ts`)
`normalizeFormat(format)` maps raw Discogs format strings (e.g., `"CD, Album"`, `"2xCD, Album"`, `"LP, Album, RE"`, `"Blu-ray, Blu-ray Audio"`) to simplified labels using keyword matching in priority order:

| Priority | Keywords | Label |
|----------|----------|-------|
| 1 | `blu-ray`, `bd` | `BD` |
| 2 | `dvd` | `DVD` |
| 3 | `cd`, `sacd` | `CD` |
| 4 | `lp`, `vinyl`, `7"`, `10"`, `12"` | `VINYL` |

Blu-ray/BD checked first to avoid false `CD` match on `"SACD"`. Returns original string if no match. Used for both display rendering and sort comparison.

### Column visibility
Persisted in localStorage via `useColumnVisibility` hook. `DEFAULT_VISIBLE_COLUMNS` only affects new users or cleared storage.

## Testing

### Structure
- Tests in `__tests__/` at project root (not co-located with source).
- `*.test.ts` for logic, `*.test.tsx` for components.
- Use `describe` + `it` blocks (not `test`). Nest `describe` for grouping.
- Test names start with a verb: "maps release data...", "retries on 429...".

### Test files
| File | Focus | Tests |
|------|-------|-------|
| `csvParser.test.ts` | CSV parsing, condition mapping | 13 |
| `database.test.ts` | Dexie operations, dedup, merge | 14 |
| `discogsApi.test.ts` | API client, rate limiting, OAuth | 25 |
| `formatters.test.ts` | normalizeFormat (CD/DVD/BD/VINYL) | 21 |
| `CollectionTable.test.tsx` | Table rendering, sorting, UI | 6 |

### Setup
- `fake-indexeddb/auto` loaded via `setupFiles` — Dexie works in tests automatically.
- `@testing-library/jest-dom` loaded via `setupFilesAfterEnv`.
- CSS imports mocked with `identity-obj-proxy`.
- `structuredClone` polyfilled in `jest.setup.ts` for jsdom.

### Patterns
- Define local helpers in each test file (e.g., `makeItem()`, `createMockResponse()`).
- `beforeEach`/`afterEach` for setup/teardown (clear DB, reset mocks, restore fetch).
- Mock `globalThis.fetch` directly; save/restore original in `afterEach`.
- Use `jest.useFakeTimers()` + `jest.advanceTimersByTime()` for rate limit / delay tests.
- Component tests: wrap with `I18nextProvider`, use `renderTable()` helper with defaults.
- Query by `data-testid`, `screen.getByText()`, `screen.getByRole()`.
- Async errors: `await expect(promise).rejects.toThrow(ErrorClass)`.

### Running tests after changes
Always run `npm test` after making changes. If you modified a single file, run just that test file first for faster feedback, then the full suite.

## Database (Dexie / IndexedDB)

### Schema (`src/db/database.ts`)
- DB name: `MyCollectionDB`.
- **Version 1:** `++id, [releaseId+dateAdded], artist, title, collectionFolder, dateAdded, purchasePrice`.
- **Version 2:** Adds `releaseId` and `lastFetched` indexes (for querying unfetched items and updating by releaseId).
- Compound unique key `[releaseId+dateAdded]` for CSV deduplication (same album may appear in different folders).

### Operations (`src/db/operations.ts`)
| Function | Description |
|----------|-------------|
| `addItems(items)` | Bulk insert with dedup on `[releaseId+dateAdded]`. Returns `{ added, skipped }`. |
| `getAllItems()` | Returns all `CollectionItem` records. |
| `updatePurchasePrice(id, price)` | Updates single item's `purchasePrice` by auto-increment ID. |
| `updateReleaseMetadata(releaseId, metadata)` | Updates ALL items matching `releaseId`. Strips `undefined` values before update to avoid overwriting previously-fetched fields. Casts to `Partial<CollectionItem>` to work around Dexie `UpdateSpec` type limitation with array properties. |
| `getUniqueReleaseIds()` | Returns deduplicated array of all release IDs. |
| `getUnfetchedReleaseIds()` | Returns deduplicated release IDs where `lastFetched` is falsy. |
| `getItemCount()` | Returns total item count. |
| `clearAll()` | Clears all items from collection table. |

### `ReleaseMetadata` interface
Exported from `operations.ts`. Contains all optional API metadata fields (thumbUrl, coverUrl, genres, styles, year, country, tracklist, lowestPrice, numForSale, communityHave/Want/Rating, priceSuggestions, discogsUrl) plus required `lastFetched: string`.

## Discogs API Integration

### Proxy (`src/services/discogsApi.ts`)
- All API calls go through the Cloudflare Worker proxy at `https://discogs.my-collection.mobulum.com`, not directly to `api.discogs.com`.
- Auth: `X-Discogs-Consumer-Key` and `X-Discogs-Consumer-Secret` headers (not query params).
- Each item requires 2 API calls: release data + price suggestions. Price suggestions may 403/404 — catch and continue.

### Rate limiting constants
| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_REQUEST_DELAY_MS` | `1100` | Minimum delay between requests (~1.1s) |
| `MAX_RETRIES` | `5` | Max retry attempts on 429 |
| `DEFAULT_RETRY_WAIT_MS` | `30_000` | Default wait when no `Retry-After` header |
| `BACKOFF_MULTIPLIER` | `2` | Exponential backoff multiplier |
| `RATE_LIMIT_LOW_THRESHOLD` | `5` | Switch to slow mode when remaining < 5 |
| `RATE_LIMIT_SLOW_DELAY_MS` | `3000` | Delay in slow mode (3s) |

Rate limit UI feedback via `RateLimitListener` callback + `RateLimitEvent` objects.

### OAuth 1.0a flow
Handled server-side by the Cloudflare Worker (separate repo at `/Users/zenedith/git/discogs-api-worker/`).

1. SPA calls `startOAuthFlow(credentials, callbackUrl)` → worker `GET /oauth/authorize?callback_url=<spa_url>`
2. Worker returns `{ authorizeUrl }` → SPA redirects user to Discogs
3. User authorizes → Discogs redirects to worker `/oauth/callback`
4. Worker exchanges verifier for access token, caches `hash(key:secret) → access_token` in KV
5. Worker redirects user back to SPA with `?oauth=success`
6. SPA detects param, calls `checkOAuthStatus(credentials)` → worker `GET /oauth/status`
7. Disconnect: `revokeOAuthToken(credentials)` → worker `DELETE /oauth/token`

### API functions
| Function | Description |
|----------|-------------|
| `fetchRelease(releaseId, credentials, signal?)` | GET `/releases/{id}` |
| `fetchPriceSuggestions(releaseId, credentials, signal?)` | GET `/marketplace/price_suggestions/{id}` |
| `mapReleaseToMetadata(release, priceSuggestions?)` | Transforms API response to `ReleaseMetadata` |
| `fetchReleaseWithPrices(releaseId, credentials, signal?)` | Combined fetch (release + prices, swallows 403/404 on prices) |
| `startOAuthFlow(credentials, callbackUrl)` | Initiates OAuth flow |
| `checkOAuthStatus(credentials)` | Checks if OAuth is completed |
| `revokeOAuthToken(credentials)` | Revokes OAuth access token |
| `setRateLimitListener(listener)` | Sets global rate limit callback for UI feedback |
| `resetRateLimiter()` | Resets internal rate limiter state (for testing) |

## Vite Configuration

```ts
base: '/'
plugins: [react(), tailwindcss()]
server.allowedHosts: ['localhost-vite.mobulum.xyz', 'my-collection.mobulum.com', 'my-collection.github.io']
```

## Project Layout

```
src/
  components/
    CollectionTable/
      CollectionRow.tsx         # Row rendering with renderCell switch
      CollectionTable.tsx       # Table wrapper, SORTABLE_FIELDS, headers
      ColumnSelector.tsx        # Column visibility toggle UI
      ExpandedDetails.tsx       # Expanded row details (metadata, tracklist, prices)
      PriceSuggestionsDisplay.tsx # Price suggestions table per condition
      PurchasePriceInput.tsx    # Inline editable purchase price
      SearchBar.tsx             # Search input with clear button
      SortableHeader.tsx        # Clickable sort header (asc/desc/none)
    CSVImport/
      CSVImportButton.tsx       # File picker + import trigger
    DiscogsSettings/
      DiscogsTokenInput.tsx     # Credentials input, OAuth connect/disconnect
    LanguageSwitcher/
      LanguageSwitcher.tsx      # EN/PL toggle
    Layout/
      Header.tsx                # App header with title and actions
      Layout.tsx                # Page layout wrapper
  db/
    database.ts                 # Dexie schema (v1, v2), CollectionDatabase class
    operations.ts               # CRUD functions, ReleaseMetadata interface
    types.ts                    # CollectionItem, ColumnKey, SortField, MediaCondition, etc.
  hooks/
    useCollection.ts            # Items, sort, search, filter, priceTotal
    useColumnVisibility.ts      # localStorage-persisted column toggle
    useCSVImport.ts             # CSV file import logic
    useDiscogsAuth.ts           # OAuth flow (startOAuth, checkStatus, disconnect)
    useDiscogsFetch.ts          # Batch + single fetch with progress tracking
  i18n/
    en.json                     # English translations (107 keys)
    pl.json                     # Polish translations (107 keys)
    index.ts                    # i18next configuration
  services/
    discogsApi.ts               # API client, rate limiting, OAuth functions
  utils/
    csvParser.ts                # PapaParse wrapper, row mapping, condition parsing
    formatters.ts               # formatDate, formatPrice, normalizeFormat
  App.tsx                       # Root component (default export)
  App.css                       # Minimal base styles
  main.tsx                      # React DOM entry point
  index.css                     # Tailwind imports
__tests__/
  csvParser.test.ts             # 13 tests — CSV parsing, condition mapping
  database.test.ts              # 14 tests — Dexie operations, dedup, merge
  discogsApi.test.ts            # 25 tests — API client, rate limiting, OAuth
  formatters.test.ts            # 21 tests — normalizeFormat (CD/DVD/BD/VINYL)
  CollectionTable.test.tsx      # 6 tests — table rendering, sorting, UI
.github/workflows/
  deploy.yml                    # CI/CD: lint -> test -> build -> deploy to GitHub Pages
jest.config.ts                  # Jest 30 config (jsdom, ts-jest, fake-indexeddb)
jest.setup.ts                   # @testing-library/jest-dom + structuredClone polyfill
tsconfig.json                   # Root config with project references
tsconfig.app.json               # App config (erasableSyntaxOnly, verbatimModuleSyntax)
tsconfig.test.json              # Test config (no verbatimModuleSyntax, esModuleInterop)
vite.config.ts                  # Vite 8 config (base: '/', react, tailwindcss)
eslint.config.js                # ESLint 9 flat config (ESM)
package.json                    # type: "module", scripts, dependencies
AGENTS.md                       # This file
```
