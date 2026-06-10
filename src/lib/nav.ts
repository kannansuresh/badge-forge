/**
 * Client-side navigation helpers: active nav link highlighting,
 * mobile menu close on navigation.
 */

/** Strip the base path prefix so comparisons work on subpath deployments. */
function normalizedPath(base: string, raw: string): string {
  if (base === '/' || base === '') return raw;
  return raw.startsWith(base) ? raw.slice(base.length - 1) || '/' : raw;
}

/** Update the active nav link highlight based on current path. */
function updateActiveNav(): void {
  if (typeof window === 'undefined') return;
  const base = document.body.dataset.base || '/';
  const path = normalizedPath(base, window.location.pathname);
  document.querySelectorAll('.nav-link').forEach((link) => {
    const match = link.getAttribute('data-match');
    const isActive =
      match === 'home'
        ? path === '/'
        : match === 'gallery'
          ? path.startsWith('/gallery')
          : match === 'mybadges'
            ? path === '/my-badges' || path === '/badge'
            : path === '/' + match;
    link.classList.toggle('bg-primary/10', isActive);
    link.classList.toggle('text-primary', isActive);
    link.classList.toggle('font-semibold', isActive);
  });
}

/**
 * Initialize navigation-related listeners.
 * Call once on page load — uses astro:page-load for SPA navigation support.
 */
export function initNav(): void {
  if (typeof window === 'undefined') return;
  document.addEventListener('astro:page-load', updateActiveNav);
}
