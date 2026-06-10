/**
 * Pagefind-powered site search — lazy-loaded, keyboard accessible.
 * Reads the base path from document.body.dataset.base (set in Layout.astro)
 * to support subpath deployments (e.g. GitHub Pages at /badge-forge/).
 */

// ── Pagefind type definitions ──────────────────────────────
interface PagefindResultData {
  url: string;
  meta?: { title?: string };
  content?: string;
}

interface PagefindResult {
  data: () => Promise<PagefindResultData>;
}

interface PagefindSearchFn {
  (query: string, opts?: Record<string, unknown>): Promise<{ results: PagefindResult[] }>;
}

/** Compute the pagefind base path from the body data attribute. */
function getPagefindBase(): string {
  if (typeof document === 'undefined') return '/pagefind/';
  const base = document.body.dataset.base || '/';
  return base + 'pagefind/';
}

let pagefindSearch: PagefindSearchFn | null = null;
let pagefindBasePath = '';
let loading = false;
let debounceId: ReturnType<typeof setTimeout>;

function getInput(): HTMLInputElement | null {
  return document.getElementById('search-input') as HTMLInputElement | null;
}

function getResults(): HTMLDivElement | null {
  return document.getElementById('search-results') as HTMLDivElement | null;
}

async function loadPagefind(): Promise<boolean> {
  if (pagefindSearch) return true;
  if (loading) return false;
  loading = true;
  try {
    if (!pagefindBasePath) pagefindBasePath = getPagefindBase();
    const jsUrl = pagefindBasePath + 'pagefind.js';
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const mod: Record<string, unknown> = await dynamicImport(jsUrl);
    const resolved =
      (mod.search as PagefindSearchFn | undefined) ??
      (mod.default as { search?: PagefindSearchFn } | undefined)?.search ??
      (mod as unknown as PagefindSearchFn);
    if (typeof resolved !== 'function') {
      console.error('Pagefind: search function not found', Object.keys(mod));
      pagefindSearch = null;
      loading = false;
      return false;
    }
    pagefindSearch = resolved;
    return true;
  } catch (e) {
    console.warn('Pagefind unavailable (run bun run build && bun preview):', e);
    loading = false;
    return false;
  }
}

async function doSearch(): Promise<void> {
  const input = getInput();
  const results = getResults();
  if (!input || !results) return;
  const query = input.value;

  if (!query.trim()) {
    results.innerHTML = '';
    results.classList.add('hidden');
    return;
  }

  let searchFn = pagefindSearch;
  if (!searchFn) {
    const ok = await loadPagefind();
    if (!ok || !pagefindSearch) {
      results.innerHTML =
        '<div class="p-4 text-sm text-base-content/50">Search unavailable — run <code>bun run build && bun preview</code>.</div>';
      results.classList.remove('hidden');
      return;
    }
    searchFn = pagefindSearch;
  }

  try {
    if (!pagefindBasePath) pagefindBasePath = getPagefindBase();
    const pfResult = await searchFn(query.trim(), { basePath: pagefindBasePath });
    if (!pfResult?.results?.length) {
      results.innerHTML = '<div class="p-4 text-sm text-base-content/50">No results found.</div>';
      results.classList.remove('hidden');
      return;
    }
    const items = await Promise.all(
      pfResult.results.slice(0, 8).map(async (r: PagefindResult) => {
        const data = await r.data();
        return `<a href="${data.url}" class="block p-3 hover:bg-base-200 transition-colors no-underline text-sm font-medium truncate">${data.meta?.title || data.url || 'Untitled'}</a>`;
      }),
    );
    results.innerHTML = items.join('');
    results.classList.remove('hidden');
  } catch (err) {
    console.error('Pagefind search error:', err);
    results.innerHTML = '<div class="p-4 text-sm text-error">Search error — try again.</div>';
    results.classList.remove('hidden');
  }
}

let initialized = false;

/** Initialize search event listeners. Idempotent — safe to call multiple times. */
export function initSearch(): void {
  if (typeof document === 'undefined') return;
  if (initialized) return;
  initialized = true;

  // Use event delegation on document — survives ClientRouter DOM swaps
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    if (target.id !== 'search-input') return;
    clearTimeout(debounceId);
    debounceId = setTimeout(doSearch, 200);
  });

  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (target.id !== 'search-input') return;
    loadPagefind();
    if ((target as HTMLInputElement).value) doSearch();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const inp = getInput();
      if (inp) {
        inp.focus();
        inp.select();
      }
    }
    if (e.key === 'Escape') {
      const results = getResults();
      if (results && !results.classList.contains('hidden')) {
        results.classList.add('hidden');
        const inp = getInput();
        if (inp) inp.blur();
      }
    }
  });

  document.addEventListener('click', (e) => {
    const container = document.getElementById('badgeforge-search');
    if (container && !container.contains(e.target as Node)) {
      const results = getResults();
      if (results) results.classList.add('hidden');
    }
  });
}
