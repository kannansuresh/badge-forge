/**
 * Theme management — shared between Layout.astro (inline bootstrap)
 * and ThemeController.astro (toggle checkbox).
 *
 * The inline script in Layout.astro duplicates the essential
 * resolveTheme logic (without imports) to prevent FOUC before
 * the module graph loads. Everything else lives here.
 */

/** Resolve the active theme: explicit choice → system preference → light. */
export function resolveTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply the resolved theme to <html data-theme>. */
export function applyTheme(): void {
  document.documentElement.setAttribute('data-theme', resolveTheme());
}

/** Toggle between dark ↔ light, persist to localStorage. */
export function toggleTheme(): void {
  const next = resolveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

/** Sync a checkbox's checked state to the current theme. */
export function syncCheckbox(checkboxId: string): void {
  const cb = document.getElementById(checkboxId) as HTMLInputElement | null;
  if (cb) cb.checked = resolveTheme() === 'dark';
}

/**
 * Attach theme listeners for SPA navigation (ClientRouter).
 * Call once on initial page load.
 */
export function initThemeListeners(): void {
  // Restore theme after ClientRouter swaps <html>
  document.addEventListener('astro:after-swap', applyTheme);
  // Re-sync toggle checkbox after page content loads
  document.addEventListener('astro:page-load', () => syncCheckbox('theme-toggle'));
}
