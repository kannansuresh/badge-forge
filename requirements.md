## 1. Project Overview

You are building **BadgeCraft**, a high-performance, developer-focused, local-first web application designed to create, customize, and browse markdown/HTML badges powered by the `shields.io` API. The application must feature a real-time visual builder, a curated category-based gallery, and a local history section where users can save their creations securely in their browser.

---

## 2. Tech Stack & Infrastructure

The application must strictly use the following technology stack:

* **Framework:** Astro.js (Static Site Generation / SSG layout with interactive React islands).
* **Interactivity:** React.js (for the real-time builder, dashboard state, and storage management).
* **Styling:** Tailwind CSS + DaisyUI (for clean UI components, cards, forms, and layout).
* **Package Manager:** Bun.
* **Local Storage:** IndexedDB managed via **Dexie.js** (for a clean, promise-based transactional local-first workflow).
* **Icons:** Integration with the `simple-icons` package/metadata for developer and brand logos.
* **Deployment Platform:** GitHub Pages (fully static build via GitHub Actions CI/CD).

> ⚠️ **Agent Instruction:** Before generating code, use your web search or latest documentation retrieval tools to verify the most up-to-date APIs and schema requirements for **Astro Content Collections**, **Dexie.js initialization**, and **Simple Icons metadata parsing**.

---

## 3. Directory & Folder Structure

Maintain a highly modular structure. The curated gallery is data-driven, powered by Astro Content Collections with individual JSON files inside folder-based categories.

```text
├── .github/workflows/deploy.yml   # GitHub Actions configuration for Pages
├── src/
│   ├── content/
│   │   ├── config.ts              # Content Collections schema definitions
│   │   └── gallery/               # Curated gallery JSON files
│   │       ├── tech-stack.json
│   │       ├── project-health.json
│   │       └── social.json
│   ├── components/
│   │   ├── LiveStudio.tsx         # Core React visual builder island
│   │   ├── BadgeCard.tsx          # Reusable badge card component
│   │   ├── Dashboard.tsx          # Local history & storage panel
│   │   └── ThemeController.tsx    # Light/Dark mode switcher
│   ├── layouts/
│   │   └── Layout.astro           # Global page shell (Meta, HTML, Navbar, Footer)
│   └── pages/
│       ├── index.astro            # Landing page / Quick Start
│       ├── builder.astro          # Live Studio route
│       ├── gallery/               # Curated exploration pages
│       │   ├── index.astro        # Category list view
│       │   └── [category].astro   # Dynamic category view
│       └── dashboard.astro        # Saved local badges view

```

---

## 4. Feature Specifications

### A. Core Core Module: "Live Studio" Builder (React Island)

A robust split-pane canvas optimized for real-time visualization.

* **Desktop Layout:** 50/50 Split. Left side handles configuration inputs. Right side contains a fixed, sticky preview layout.
* **Mobile Layout:** Stacked approach. The inputs occupy the main scrolling view, while the dual preview locks into a **Sticky Header** or a collapsible **Bottom Drawer** to prevent layout shifting.
* **The Dual Preview Canvas:**
* **Magnified View:** A large, scaled up rendering of the badge to inspect font baseline alignments and logo padding.
* **Actual-Size View:** A $1:1$ scale representation showing exactly how the badge renders on a live GitHub README canvas.


* **Inputs & Functionality:**
* Interactive inputs for text parameters: `label` (left side) and `message` (right side).
* Color selection using DaisyUI palettes + a hex input string mapping directly to Shields.io URL patterns.
* **Simple Icons Integration:** A smart-search autocomplete search box. Typing dynamically queries the Simple Icons collection. Selecting an icon automatically pulls its unique URL slug and auto-populates the badge color picker with that brand’s official hex color string.
* One-click copying utilities for Markdown formatting, HTML embeddings, and Raw URL routes.
* A "Save to Collection" trigger that commits the config layout directly to IndexedDB.



### B. Curated "Discovery" Gallery (Astro Static Content)

* **Data Layer:** Configured in `src/content/config.ts` using Astro's `defineCollection` with `type: 'data'`.
* **JSON File Schema:**

```json
{
  "categoryName": "Tech Stack",
  "badges": [
    {
      "id": "react-badge",
      "label": "Frontend",
      "message": "React",
      "color": "61DAFB",
      "logo": "react",
      "logoColor": "white",
      "style": "flat"
    }
  ]
}

```

* **Interaction Flow:** Clicking a badge from the static gallery securely transitions the user to the `/builder` route while passing the configurations into the React state engine, permitting instant tweaking and custom edits.

### C. "My Backpack" Local Dashboard (Dexie.js + IndexedDB)

* Complete local-first operational framework. No remote user login databases are utilized.
* Renders a fully populated grid component of user-saved configurations querying Dexie.js.
* **Data Portability:**
* **Export:** Single-click operation to compile all IndexedDB state contexts into a downloadable, clean JSON snapshot.
* **Import:** File parsing utility accepting JSON snapshots to safely merge or replace existing browser-side database tables.



---

## 5. UI/UX & Design Token Matrix

* **Framework:** Must utilize Tailwind CSS natively extended via DaisyUI semantic primitives.
* **Theme Management:** Provide an explicit toggle supporting native system preference syncing, offering a high-contrast **Light Mode** and a clean **Dark Mode** utilizing DaisyUI’s native data themes (`data-theme="dark"` / `data-theme="light"`).
* **Interactivity Polish:** Interactive elements must display defined focus outlines, instant clipboard action tooltips ("Copied!"), and smooth hover translations for a polished web utility experience.

---

## 6. Verification and Deployment Checklist

* Verify static build safety executing `bun run build`. Ensure there are no runtime window references in components meant for static rendering blocks; wrap user storage interactions in standard client-load safe environments (`client:load`).
* Configure a GitHub Actions automated workspace target pushing generated output bundles safely into the `gh-pages` active tracking reference.
