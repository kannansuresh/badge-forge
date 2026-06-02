# 🛡️ BadgeForge

A high-performance, local-first web application for creating, customizing, and browsing markdown/HTML badges powered by [shields.io](https://shields.io). Built with Astro, React, Tailwind CSS, DaisyUI, and Dexie.js.

![BadgeForge](https://img.shields.io/badge/BadgeForge-v1.0-6366f1?style=for-the-badge)

## Features

### 🎨 Live Studio Builder

- **Real-time dual preview** — magnified (2.5×) and actual-size views side by side
- **3,400+ brand icons** — smart fuzzy search powered by Simple Icons. Select a logo to auto-populate its official brand hex color
- **Color picker with palette** — DaisyUI theme colors + native OS color picker via dropdown
- **Five badge styles** — flat, flat-square, plastic, for-the-badge, social
- **One-click copy** — Markdown, HTML, and raw URL with DaisyUI tabbed interface
- **Save to backpack** — one click to persist to IndexedDB

### 🖼️ Curated Gallery

- **Data-driven** — powered by Astro Content Collections with Zod validation
- **Three categories** — Tech Stack (15 badges), Project Health (12), Social & Community (10)
- **Copy & Edit** — copy badge code directly from the gallery, or click Edit to customize in the Live Studio
- **Zero JavaScript** — gallery cards render as pure static HTML with a single vanilla JS script

### 🎒 My Backpack (Local Dashboard)

- **Local-first** — all data stored in IndexedDB via Dexie.js, never leaves your browser
- **CRUD operations** — save, browse, edit, and delete your badge creations
- **Data portability** — export all badges as JSON, import snapshots from other devices
- **No accounts, no servers, no tracking**

### 🌓 Theme Support

- **Light & Dark modes** — DaisyUI semantic theming with system preference detection
- **Persistent** — theme preference saved to localStorage
- **Self-hosted fonts** — Inter (body) and JetBrains Mono (code) via Astro Fonts

### 🚀 Performance

- **Static site generation** — Astro builds fully static HTML with zero server code
- **Minimal JavaScript** — React used only for interactive islands (builder, dashboard)
- **Lazy-loaded icons** — Simple Icons JSON (372 KB / 100 KB gzipped) loaded on demand
- **Icon preview caching** — optional Dexie-backed SVG cache with opt-in prompt

## Tech Stack

| Layer           | Technology                                                                            |
| --------------- | ------------------------------------------------------------------------------------- |
| Framework       | [Astro](https://astro.build) 6.x with React islands                                   |
| Interactivity   | [React](https://react.dev) 19 (minimal — only interactive parts)                      |
| Styling         | [Tailwind CSS](https://tailwindcss.com) 4 + [DaisyUI](https://daisyui.com) 5          |
| Icons           | [astro-icon](https://github.com/natemoo-re/astro-icon) + [Lucide](https://lucide.dev) |
| Fonts           | Inter & JetBrains Mono (Astro Fonts, self-hosted)                                     |
| Local Database  | [Dexie.js](https://dexie.org) 4 (IndexedDB wrapper)                                   |
| Icons Data      | [Simple Icons](https://simpleicons.org) 16 (3,400+ brand logos)                       |
| Package Manager | [Bun](https://bun.sh)                                                                 |
| Deployment      | GitHub Pages via GitHub Actions                                                       |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0

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
```

### Project Structure

```text
├── .github/workflows/deploy.yml
├── astro.config.mjs
├── src/
│   ├── content.config.ts           # Content Collections schema
│   ├── content/gallery/            # Curated badge JSON files
│   ├── components/
│   │   ├── LiveStudio.tsx          # Builder (React island)
│   │   ├── Dashboard.tsx           # Backpack (React island)
│   │   ├── ThemeController.tsx     # Theme toggle (React island)
│   │   ├── ColorInput.tsx          # Color picker (React)
│   │   ├── CopyTabs.tsx            # Code tabs (React)
│   │   ├── IconPreview.tsx         # Icon SVG loader (React)
│   │   ├── BadgeCard.tsx           # Badge card (React, used in Dashboard)
│   │   └── GalleryBadgeCard.astro  # Gallery card (Astro + vanilla JS)
│   ├── layouts/Layout.astro        # Global page shell
│   ├── lib/
│   │   ├── storage.ts              # Dexie.js DB + clipboard + icon cache
│   │   └── icons.ts               # Simple Icons loader + fuzzy search
│   ├── pages/
│   │   ├── index.astro             # Landing page
│   │   ├── builder.astro           # Live Studio
│   │   ├── dashboard.astro         # My Backpack
│   │   └── gallery/
│   │       ├── index.astro         # Category list
│   │       └── [category].astro    # Dynamic category page
│   └── styles/global.css           # Tailwind + DaisyUI themes
```

## Deployment

The app deploys to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). Push to `main` to trigger:

1. Checkout → Bun setup → Install → Build → Deploy to Pages

Set `SITE_URL` environment variable in the workflow to match your GitHub Pages URL.

## License

MIT
