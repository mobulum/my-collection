# My Collection

A client-side web app for managing your Discogs vinyl/CD/DVD/BD collection. Import your Discogs CSV export, enrich it with metadata and price suggestions via the Discogs API, search, sort, and track purchase prices — all stored locally in IndexedDB.

**Live:** deployed to GitHub Pages via CI.

## Features

- **CSV import** — drag-and-drop or pick your Discogs collection export file
- **Discogs API enrichment** — fetch cover art, genres, styles, tracklist, community stats, and price suggestions (OAuth 1.0a via Cloudflare Worker proxy)
- **Search & sort** — filter by artist/title, sort by date added, price, format, folder, etc.
- **Suggested price** — computed per-item from Discogs price suggestions based on media condition
- **Purchase price tracking** — inline-editable field with running total
- **Column customization** — show/hide any of the 25 available columns
- **Internationalization** — English and Polish (auto-detected)
- **Offline-first** — all data stored in the browser (IndexedDB via Dexie.js)
- **Dark mode** — via Tailwind `dark:` variants

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript 6, Vite 8, TailwindCSS 4 |
| Storage | Dexie.js (IndexedDB) |
| I18n | react-i18next |
| CSV | PapaParse |
| Testing | Jest 30, Testing Library, fake-indexeddb |
| Linting | ESLint 10 (flat config) |
| CI/CD | GitHub Actions → GitHub Pages |

## Getting Started

```bash
npm install
npm run dev          # start dev server with HMR
```

Open http://localhost:5173.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
  components/       # React UI components (CollectionTable, CSVImport, DiscogsSettings, Layout)
  db/               # Dexie schema, CRUD operations, types
  hooks/            # Custom hooks (useCollection, useCSVImport, useDiscogsFetch, useDiscogsAuth)
  i18n/             # i18next config + EN/PL translations
  services/         # Discogs API client (rate limiting, OAuth)
  utils/            # CSV parser, formatters
__tests__/          # Jest test suites
```

See [AGENTS.md](./AGENTS.md) for detailed architecture documentation.
