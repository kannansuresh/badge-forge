# AGENTS.md — BadgeForge

Instructions for AI coding agents (Claude Code, etc.) working on this codebase.

## Self-Update Rules

### When you make changes, update this file if

1. You add a new component or module — add it to the **Project Map** section
2. You change the tech stack or add a dependency — update the **Tech Stack** section
3. You change the build process or project conventions — update the relevant section
4. You discover a gotcha or pattern worth documenting — add it to **Patterns & Gotchas**

### When you make changes, update README.md if

1. You add a new feature — add it to the **Features** section
2. You remove or deprecate a feature — remove it from the **Features** section
3. You change the setup/install instructions — update **Getting Started**
4. You change the project structure — update the **Project Structure** diagram
5. You change the tech stack — update the **Tech Stack** table

## Project Map

```text
badgeforge/
├── .github/workflows/deploy.yml         # GitHub Actions → Pages
├── .github/workflows/pr.yml             # GitHub Actions → PR Audit (Fallow)
├── astro.config.mjs                     # Astro 6 + React + Tailwind + astro-icon + fonts
├── tsconfig.json                        # TypeScript strict config (extends astro/tsconfigs/strictest)
├── eslint.config.mjs                    # ESLint v10 flat config (js + typescript-eslint + astro)
├── .prettierrc                          # Prettier with astro plugin
├── AGENTS.md                            # This file
├── README.md                            # Project documentation
├── package.json                         # Dependencies & scripts (Bun)
├── public/
│   └── favicon.svg                      # Custom forge/anvil SVG icon
├── src/
│   ├── content.config.ts                # Content Collections: gallery schema (glob + Zod)
│   ├── env.d.ts                         # Astro client type reference
│   ├── content/gallery/                 # 19 JSON files (328 curated badges)
│   ├── components/
│   │   ├── LiveStudio.tsx               # [React] Builder form + dual preview + copy tabs
│   │   ├── Dashboard.tsx                # [React] Saved badges grid + import/export + filter
│   │   ├── BadgeCard.tsx                # [React] Reusable badge card (copy/edit/delete/details)
│   │   ├── CategoryManager.tsx          # [React] Full category CRUD with modal confirmations
│   │   ├── BadgeDetailView.tsx          # [React] Reusable badge detail presentation view
│   │   ├── GalleryBadgeDetail.tsx       # [React] Read-only badge detail (gallery, static SSG)
│   │   ├── UserBadgeDetail.tsx          # [React] Read-only badge detail (user-saved, client-side)
│   │   └── ThemeController.astro        # [Astro] DaisyUI swap toggle + astro:page-load sync
│   ├── layouts/Layout.astro             # Global shell: navbar, ClientRouter, theme, footer
│   ├── lib/
│   │   ├── storage.ts                   # Dexie DB v3, clipboard, URL builder, formatters, CRUD
│   │   ├── icons.ts                     # Simple Icons loader, titleToSlug, fuzzy search
│   │   ├── gallery-categories.ts        # 19 gallery category definitions for seeding
│   │   └── dom.ts                       # Browser DOM utils (clipboard, copyToClipboard)
│   ├── pages/
│   │   ├── index.astro                  # Landing: hero + feature cards + CTA
│   │   ├── forge.astro                  # Forge page (LiveStudio React island)
│   │   ├── my-badges.astro              # My Badges page (Dashboard React island)
│   │   ├── badge.astro                  # User badge detail (UserBadgeDetail React island, ?id= query)
│   │   ├── categories.astro             # Category management (CategoryManager React island)
│   │   └── gallery/
│   │       ├── index.astro              # Category list with preview strips
│   │       ├── [category].astro         # Dynamic category — BadgeCard React islands grid
│   │       └── [category]/[badge].astro # Static badge detail — GalleryBadgeDetail React island
│   └── styles/global.css                # Tailwind v4 + DaisyUI v5 themes (light/dark)
```

## Tech Stack

| Layer           | Package                                              | Version     | Notes                       |
| --------------- | ---------------------------------------------------- | ----------- | --------------------------- |
| Framework       | `astro`                                              | ^6.4        | SSG + React islands         |
| React           | `@astrojs/react`, `react`, `react-dom`               | ^5, ^19     | Islands only — 7 .tsx files |
| CSS             | `tailwindcss`, `daisyui`, `@tailwindcss/vite`        | ^4, ^5      | DaisyUI v5 themes           |
| Icons (Astro)   | `astro-icon`, `@iconify-json/lucide`                 | ^1          | Lucide icon set             |
| Icons (React)   | `lucide-react`                                       | ^1          | For React components        |
| Database        | `dexie`, `dexie-export-import`                       | ^4          | IndexedDB wrapper           |
| Brand Icons     | `simple-icons`                                       | ^16         | 3,400+ brand logos          |
| Linting         | `eslint`, `typescript-eslint`, `eslint-plugin-astro` | ^10, ^8, ^1 | Flat config                 |
| Formatting      | `prettier`, `prettier-plugin-astro`                  | ^3, ^0.14   |                             |
| Package Manager | `bun`                                                | ≥1.3        | Lockfile: bun.lock          |

## Architecture Rules

### React Islands for Interactivity (No traditional DOM manipulation)

- React components (`*.tsx`) should be used for dynamic interactivity (forms, search autocompletes, dynamic grids, dialog modal overlays, database syncing).
- This avoids traditional manual DOM selectors, cloning, and element mutations in plain TypeScript scripts.
- Render React islands in Astro pages with hydration triggers (e.g. `<Component client:load />` or `<Component client:visible />`).
- Reuse the same components (e.g. `BadgeCard.tsx`, `BadgeDetailView.tsx`) across both server-rendered loops and client-rendered grids to maintain DRY integrity.

### Content Collections

- Config file: `src/content.config.ts` (Astro 6 path, NOT `src/content/config.ts`)
- Must use `glob` loader (Astro 6 requirement)
- Gallery JSON files: `src/content/gallery/*.json` (19 files, 328 badges)
- Schema: Zod validation in `defineCollection()`

### Client-Side Navigation

- `ClientRouter` from `astro:transitions` enables SPA-like navigation (no page reloads)
- All interactive components must re-initialize on `astro:page-load` event
- Theme restoration also uses `astro:after-swap` to prevent reset during navigation

### Styling

- Use DaisyUI component classes (`btn`, `card`, `fieldset`, `input`, `join`, `tabs`, `modal`, etc.)
- No custom CSS classes unless DaisyUI genuinely doesn't provide the behavior
- Theme colors use DaisyUI theme variables (`--color-primary`, `--color-base-100`, etc.)
- Focus rings are removed globally — DaisyUI border transitions handle visual feedback
- Two themes: light (default, indigo primary) and dark (lighter indigo, dark backgrounds)

### Fonts

- Astro 6 self-hosts fonts via `fontProviders.google()` in `astro.config.mjs`
- `<Font cssVariable="--font-sans" />` and `<Font cssVariable="--font-mono" />` in Layout.astro
- Body: Inter (400–800), Code: JetBrains Mono (400–600)
- Font files output to `dist/_astro/fonts/`

### Icon Preview Cache

- Opt-in via localStorage key `badgeforge-icon-previews`
- SVGs cached in Dexie `icons` table (v2 store, keyed by `slug`)
- Fetch from `https://cdn.simpleicons.org/{slug}`
- Refresh button clears Dexie icons table

### Session Clipboard

- Gallery/Dashboard → Forge handoff uses `sessionStorage` key `badgeforge-clipboard`
- `writeClipboard()` before navigation, `readClipboard()` on builder mount (one-shot, cleared after read)
- Fallback: URL query params (for shared/bookmarked links)
- Carries: label, message, color, logo, logoColor, style, labelColor, categorySlug, categoryId

## Patterns & Gotchas

### Dexie DB versions

- v1: `badges` table (`++id, savedAt, name, label, message`)
- v2: adds `icons` table (`slug` primary key, `svg`, `cachedAt`)
- v3: adds `categories` table (`++id, name, slug`), adds `categoryId` index on badges
- Always use `.stores()` on the latest version number
- New tables/indexes are additive — existing data is preserved across upgrades

### Category System

- Categories have a `readonly` boolean — gallery-seeded categories are readonly
- `seedDefaultCategories()` is idempotent (skips if count > 0)
- `deleteCategory()` reassigns badges to uncategorized; `deleteCategoryAndBadges()` deletes everything
- Import v2: categories export with badges, old IDs are remapped to new auto-increment IDs
- Export: readonly categories are excluded (they'll be re-seeded on import)
- Builder dropdown: user categories shown above gallery categories (optgroup split)

### Duplicate Detection

- `isDuplicate()` checks all visual fields (label, message, color, logo, logoColor, logoSize, style, labelColor) AND categoryId
- Two badges with identical visuals but different categories are NOT duplicates
- Used in `handleSave` to block exact duplicates and show "Already saved!" feedback

### Gallery Validation

- `bun run validate` checks all gallery JSON files for: valid JSON, schema compliance, duplicate badge IDs (within/across files), duplicate category slugs, hex color convention, logo existence in simple-icons
- Validation runs automatically before `bun run build`
- Errors block the build; warnings are non-blocking (non-hex colors, logo case mismatches)
- New JSON files in `src/content/gallery/` are auto-discovered by both the content collection and the validation script

### shields.io Parameters

- Full shield.io static badge parameters supported: `label`, `message`, `color`, `logo`, `logoColor`, `logoSize`, `style`, `labelColor`
- `logoSize: "auto"` enables adaptive resizing for wider brand icons (toggle in builder UI)
- `cacheSeconds` and `link` are intentionally excluded (caching is CDN-level; `link` only works with `<object>` tags, not `<img>` or markdown)

### Simple Icons data

- Import path: `simple-icons/icons.json` → resolves to `data/simple-icons.json` (no SVG paths, ~372KB)
- v16+ includes `slug` field natively; older versions need `titleToSlug()` fallback
- SDK (`simple-icons/sdk`) uses Node.js APIs — cannot be bundled for browser
- Lazy-loaded: only imported when user focuses the logo search field

### Astro 6 specifics

- Content config must be `src/content.config.ts`, not `src/content/config.ts`
- Fonts config is stable (not experimental) — use `fontProviders.google()`
- `<Font />` component is from `astro:assets`
- Client-side navigation: `ClientRouter` from `astro:transitions` (replaces deprecated `ViewTransitions`)
- Component scripts: use `astro:page-load` for re-initialization after client-side navigation

### Theme Controller

- DaisyUI `theme-controller` checkbox in `ThemeController.astro`
- Inline `<script is:inline>` in `<head>` sets `data-theme` before first paint (prevents flash)
- `astro:after-swap` listener restores theme after ClientRouter navigation
- `astro:page-load` listener syncs checkbox checked state
- localStorage key: `theme`

### Build & Deploy

- `bun run build` → static output in `dist/`
- `bun run lint` → ESLint check (`eslint src --ext .ts,.tsx,.astro`)
- `bun run format` → Prettier write (`src/**/*.{ts,tsx,astro,css,json,md}`)
- `bun run fallow:check` → Fallow static analysis check for complexity, duplication, and dead code
- `bun run fallow:audit` → Fallow pull request audit (runs on changes relative to base branch)
- GitHub Actions (Deploy): `oven-sh/setup-bun@v2` → `bun install` → `bun run build` → deploy to Pages
- GitHub Actions (PR Gate): `.github/workflows/pr.yml` executes `bun run fallow:audit` on every PR targeting main/master
- `SITE_URL` env var controls the Astro `site` config

### Badge Detail Pages

- **Gallery badges** are static SSG pages at `/gallery/[category]/[badgeId]` via `getStaticPaths` iterating all content collections. Each page uses `GalleryBadgeDetail` Astro component with: large badge preview, metadata grid, save-to-gallery button, edit-in-builder button, and 6 embed format copy options (Markdown, HTML, URL, reST, AsciiDoc, Textile).
- **User badges** live in IndexedDB and cannot be SSG'd. They use a single `/badge` page with `?id=` query param. The `UserBadgeDetail` Astro component reads the `id` from `URLSearchParams`, fetches from Dexie client-side, and renders the same full detail view plus a delete action with confirmation modal.
- Gallery badge cards link to detail pages via clickable image + label text; user badge cards link via `ExternalLink` "Details" button.
- `getBadgeById(id)` was added to `storage.ts` for single-badge lookup from Dexie.
