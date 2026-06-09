# BadgeForge

A high-performance, local-first web application for creating, customizing, and browsing markdown/HTML badges powered by [shields.io](https://shields.io). Built with Astro, React, Tailwind CSS, DaisyUI, and Dexie.js.

![BadgeForge](https://img.shields.io/badge/BadgeForge-v1.0-6366f1?style=for-the-badge)

## Features

### The Forge — Live Badge Builder

- **Real-time dual preview** — magnified (2.5×) and actual-size views side by side on desktop, collapsible on mobile
- **Seven configurable parameters** — label, message, badge color, logo, logo color, style (5 options), and label color
- **Color picker with palette** — hex input with # prefix, 8 DaisyUI theme color swatches, and native OS color picker
- **3,400+ brand icons** — smart fuzzy search powered by Simple Icons. Select a logo to auto-populate its official brand hex color
- **Optional SVG icon previews** — opt-in Dexie-backed cache via Simple Icons CDN with refresh button
- **Five export formats** — Markdown, RST, AsciiDoc, HTML, and raw URL via tabbed interface with one-click copy
- **Custom alt text** — auto-tracks message text, editable with one-click reset to default
- **Category assignment** — organized dropdown with "Your Categories" and "Gallery Categories" sections, plus inline category creation
- **Duplicate detection** — blocks identical saves (same visuals and category), shows "Already saved!" feedback
- **Edit from gallery** — session-based clipboard transfers badge config from gallery cards to the builder

### Curated Gallery — 328 Badges Across 19 Categories

- **Powered by Astro Content Collections** with Zod schema validation
- **19 categories** — AI & Bots, Blockchain & Crypto, Blog & Publishing, Browsers, CAD & 3D, CI/CD, Cloud Storage, Databases, Design, Dev Community, DevOps & Cloud, Documentation, Education, Funding & Sponsorship, IDEs & Editors, Programming Languages, Project Health, Social & Communication, Frameworks & Libraries
- **328 pre-configured badges** with correct colors, logos, and descriptions
- **Copy & Edit** — copy Markdown, HTML, or URL directly from the gallery; click Edit to customize any badge in the Forge
- **Category pre-fill** — editing a gallery badge automatically selects its category for organization

### My Badges — Local Dashboard

- **Local-first architecture** — all data stored in IndexedDB via Dexie.js (v3 schema), never leaves your browser
- **Category filters** — tabbed interface showing only categories with badges (empty categories hidden)
- **Full CRUD** — browse, edit, and delete saved badges with visual confirmation
- **Import/Export** — portable JSON snapshots with category preservation and v1/v2 format compatibility
- **Clear all** — modal with option to also remove user-created categories
- **No accounts, no servers, no tracking** — 100% client-side

### Category Management

- **Dedicated page** — `/categories` for full CRUD operations
- **User categories** — create, rename, edit descriptions, delete with context-aware confirmations
- **Gallery categories** — 19 pre-seeded readonly categories from the gallery taxonomy
- **Smart deletion** — empty categories delete silently; categories with badges offer move-to-uncategorized or delete-all options
- **Builder integration** — user categories appear above gallery categories in the Forge dropdown

### Theme Support

- **Light & Dark modes** — DaisyUI semantic theming with system preference detection
- **Smooth transitions** — swap-rotate animation on toggle
- **Persistent** — saves to localStorage, survives page refreshes and client-side navigation
- **Flash prevention** — inline head script sets theme before first paint
- **Self-hosted fonts** — Outfit (body, 400–800) and Geist Mono (code, 400–600) via Astro Fonts

### Performance & Architecture

- **Static site generation** — 24 pages build to static HTML in ~1.6s
- **Islands architecture** — React used only for 3 interactive pages; the rest is pure static HTML
- **Minimum JavaScript** — zero JS on landing page and gallery listing; gallery cards use a single TypeScript module
- **Lazy-loaded icons** — Simple Icons JSON (372 KB / 100 KB gzipped) loaded on demand when logo search is focused
- **Client-side navigation** — Astro ClientRouter enables SPA-like transitions between pages
- **Icon SVG caching** — optional opt-in Dexie-backed cache to avoid repeated CDN fetches

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Astro](https://astro.build) 6.x with React islands |
| React | [React](https://react.dev) 19 (4 .tsx components) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 4 + [DaisyUI](https://daisyui.com) 5 |
| Icons | [astro-icon](https://github.com/natemoo-re/astro-icon) + [Lucide](https://lucide.dev) |
| Fonts | Outfit & Geist Mono (Astro Fonts, self-hosted) |
| Database | [Dexie.js](https://dexie.org) 4 (IndexedDB v3 schema) |
| Icons Data | [Simple Icons](https://simpleicons.org) v16 (3,400+ brand logos) |
| Linting | ESLint v10 (flat config) + Prettier v3 |
| Package Manager | [Bun](https://bun.sh) ≥1.3 |
| Deployment | GitHub Pages via GitHub Actions |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3

### Install & Run

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Lint
bun run lint

# Format
bun run format

# Run Fallow complexity/dead code check
bun run fallow:check

# Run Fallow PR audit
bun run fallow:audit
```

### Project Structure

```text
src/
├── content.config.ts               # Astro 6 Content Collections (glob + Zod)
├── content/gallery/                # 19 JSON files (328 curated badges)
├── components/
│   ├── LiveStudio.tsx              # Forge builder (React island)
│   ├── Dashboard.tsx               # My Badges CRUD + filters (React island)
│   ├── BadgeCard.tsx               # Reusable badge card (React)
│   ├── CategoryManager.tsx         # Category CRUD page (React island)
│   ├── GalleryBadgeCard.astro      # Static gallery card + TS script
│   ├── UserBadgeDetail.astro       # Static user badge detail + progressive TS
│   └── ThemeController.astro       # Theme toggle
├── layouts/Layout.astro            # Shell: navbar, ClientRouter, theme, footer
├── lib/
│   ├── storage.ts                  # Dexie.js DB v3, clipboard, URL builder, CRUD
│   ├── icons.ts                    # Simple Icons loader + fuzzy search
│   ├── gallery-categories.ts       # 19 category definitions for seeding
│   ├── dom.ts                      # Browser DOM utilities (TypeScript)
│   └── user-badge-detail.ts        # Client-side user badge detail script
├── pages/
│   ├── index.astro                 # Landing page
│   ├── builder.astro               # Forge
│   ├── dashboard.astro             # My Badges
│   ├── categories.astro            # Category management
│   └── gallery/
│       ├── index.astro             # Category listing
│       └── [category].astro        # Per-category badge grid
└── styles/global.css               # Tailwind v4 + DaisyUI v5 themes
```

## Deployment & Quality Gates

- **Production Deployments**: The app deploys to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`) on pushes to `main`.
- **Pull Request Quality Gates**: Every pull request is audited via GitHub Actions (`.github/workflows/pr.yml`), which executes `fallow audit` to ensure no dead code, complexity, or duplication issues are introduced.

## License

MIT — Built by [Kannan Suresh](https://github.com/kannansuresh/)

