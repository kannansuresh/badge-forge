# AGENTS.md — BadgeCraft

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
badgecraft/
├── .github/workflows/deploy.yml    # GitHub Actions → Pages
├── astro.config.mjs                # Astro 6 + React + Tailwind + astro-icon + fonts
├── AGENTS.md                       # This file
├── README.md                       # Project documentation
├── package.json                    # Dependencies & scripts
├── src/
│   ├── content.config.ts           # Content Collections: gallery schema (glob + Zod)
│   ├── content/gallery/            # 3 JSON files (37 curated badges)
│   ├── components/
│   │   ├── LiveStudio.tsx          # [React] Builder form + dual preview
│   │   ├── Dashboard.tsx           # [React] IndexedDB CRUD + import/export
│   │   ├── ThemeController.tsx     # [React] DaisyUI swap toggle + localStorage
│   │   ├── ColorInput.tsx          # [React] Hex input + palette dropdown + color picker
│   │   ├── CopyTabs.tsx            # [React] Tabbed Markdown/HTML/URL code display
│   │   ├── IconPreview.tsx         # [React] Lazy SVG loader (Dexie cache → CDN fetch)
│   │   ├── BadgeCard.tsx           # [React] Reusable badge card (used in Dashboard)
│   │   └── GalleryBadgeCard.astro  # [Astro] Static card + vanilla JS copy/edit
│   ├── layouts/Layout.astro        # Global shell: navbar, theme toggle, footer
│   ├── lib/
│   │   ├── storage.ts              # Dexie DB (badges v1, icons v2), clipboard, URL builder
│   │   └── icons.ts               # Simple Icons loader, titleToSlug, fuzzy search
│   ├── pages/
│   │   ├── index.astro             # Landing: hero + feature cards + CTA
│   │   ├── builder.astro           # Live Studio page (React island)
│   │   ├── dashboard.astro         # My Backpack page (React island)
│   │   └── gallery/
│   │       ├── index.astro         # Category list with preview strips
│   │       └── [category].astro    # Dynamic category — GalleryBadgeCard grid
│   └── styles/global.css           # Tailwind + DaisyUI v5 themes (light/dark)
```

## Tech Stack

| Layer | Package | Version | Notes |
| --- | --- | --- | --- |
| Framework | `astro` | ^6.4 | SSG + React islands |
| React | `@astrojs/react`, `react`, `react-dom` | ^5, ^19 | Islands only — minimal usage |
| CSS | `tailwindcss`, `daisyui`, `@tailwindcss/vite` | ^4, ^5 | DaisyUI v5 themes |
| Icons (Astro) | `astro-icon`, `@iconify-json/lucide` | ^1 | Lucide icon set |
| Icons (React) | `lucide-react` | ^1 | For React components only |
| Database | `dexie`, `dexie-export-import` | ^4 | IndexedDB wrapper |
| Brand Icons | `simple-icons` | ^16 | 3,400+ brand logos |
| Package Manager | `bun` | ≥1.0 | Lockfile: bun.lock |

## Architecture Rules

### React is for interactivity only

- React components (`*.tsx`) should ONLY be used when state, effects, or complex event handling is needed
- Static content with simple click handlers should use Astro components (`*.astro`) with vanilla JS `<script>` blocks
- Never use `client:load` on a component that could be static HTML + a small script

### Content Collections

- Config file: `src/content.config.ts` (Astro 6 path, NOT `src/content/config.ts`)
- Must use `glob` loader (Astro 6 requirement)
- Gallery JSON files: `src/content/gallery/*.json`
- Schema: Zod validation in `defineCollection()`

### Styling

- Use DaisyUI component classes (`btn`, `card`, `fieldset`, `input`, `join`, `tabs`, etc.)
- No custom CSS classes unless DaisyUI genuinely doesn't provide the behavior
- Theme colors use DaisyUI theme variables (`--color-primary`, `--color-base-100`, etc.)
- Focus rings are removed globally — DaisyUI border transitions handle visual feedback

### Fonts

- Astro 6 self-hosts fonts via `fontProviders.google()` in `astro.config.mjs`
- `<Font cssVariable="--font-sans" />` and `<Font cssVariable="--font-mono" />` in Layout.astro
- Body: Inter (400–800), Code: JetBrains Mono (400–600)
- Font files output to `dist/_astro/fonts/`

### Icon Preview Cache

- Opt-in via localStorage key `badgecraft-icon-previews`
- SVGs cached in Dexie `icons` table (v2 store, keyed by `slug`)
- Fetch from `https://cdn.simpleicons.org/{slug}`
- Refresh button clears Dexie icons table

### Session Clipboard

- Gallery → Builder handoff uses `sessionStorage` key `badgecraft-clipboard`
- `writeClipboard()` before navigation, `readClipboard()` on builder mount (one-shot, cleared after read)
- Fallback: URL query params (for shared/bookmarked links)

## Patterns & Gotchas

### Dexie DB versions

- v1: `badges` table (`++id, savedAt, name, label, message`)
- v2: adds `icons` table (`slug` primary key, `svg`, `cachedAt`)
- Always use `.stores()` on the latest version number

### Simple Icons data

- Import path: `simple-icons/icons.json` → resolves to `data/simple-icons.json` (no SVG paths, ~372KB)
- v16+ includes `slug` field natively; older versions need `titleToSlug()` fallback
- SDK (`simple-icons/sdk`) uses Node.js APIs — cannot be bundled for browser

### Astro 6 specifics

- Content config must be `src/content.config.ts`, not `src/content/config.ts`
- Fonts config is stable (not experimental) — use `fontProviders.google()`
- `<Font />` component is from `astro:assets`

### Build & Deploy

- `bun run build` → static output in `dist/`
- GitHub Actions: `oven-sh/setup-bun@v2` → `bun install` → `bun run build` → deploy to Pages
- `SITE_URL` env var controls the Astro `site` config
