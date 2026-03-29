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

## Testing

### Structure
- Tests in `__tests__/` at project root (not co-located with source).
- `*.test.ts` for logic, `*.test.tsx` for components.
- Use `describe` + `it` blocks (not `test`). Nest `describe` for grouping.
- Test names start with a verb: "maps release data...", "retries on 429...".

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

- Schema in `src/db/database.ts` with versioned migrations.
- Compound unique key `[releaseId+dateAdded]` for CSV deduplication.
- Version 2 adds `releaseId` and `lastFetched` indexes.
- Operations are standalone async functions in `src/db/operations.ts`.
- Dexie's `UpdateSpec` doesn't accept interfaces with array properties — cast to `Partial<CollectionItem>` when calling `db.collection.update()`.

## Discogs API Integration

- All API calls go through the Cloudflare Worker proxy at `https://discogs.my-collection.mobulum.com`, not directly to `api.discogs.com`.
- Auth: `X-Discogs-Consumer-Key` and `X-Discogs-Consumer-Secret` headers (not query params).
- OAuth 1.0a flow handled server-side by the worker. SPA calls `/oauth/authorize`, `/oauth/status`, `DELETE /oauth/token`.
- Rate limiting: ~1.1s min delay, adaptive slowdown when `X-Discogs-Ratelimit-Remaining < 5`, auto-retry with exponential backoff on 429 (up to 5 retries).
- Each item requires 2 API calls (release + price suggestions). Price suggestions may 403/404 — catch and continue.

## Project Layout

```
src/
  components/        # Feature-based directories (CollectionTable/, CSVImport/, etc.)
  db/                # Dexie schema, types, CRUD operations
  hooks/             # Custom React hooks (all business logic)
  i18n/              # en.json, pl.json, i18next config
  services/          # Discogs API client (rate limiting, OAuth, proxy)
  utils/             # CSV parser, formatters
  App.tsx            # Root component
__tests__/           # All test files
.github/workflows/   # CI/CD (deploy.yml)
```
