/**
 * Browser-only DOM utilities for progressive enhancement.
 * All functions guard against SSR (typeof window === 'undefined').
 */

/** Copy text to clipboard with a fallback for older browsers. */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

/**
 * Initialize gallery badge card interactions (copy + edit).
 * Bind to `astro:page-load` so it works with client-side navigation (ClientRouter).
 */
export function initGalleryBadgeCards(): void {
  if (typeof window === 'undefined') return;

  document.querySelectorAll('[data-badgecard]').forEach((card) => {
    // Copy buttons
    card.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const text = btn.getAttribute('data-content');
        if (!text) return;
        await copyToClipboard(text);
        const orig = btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-ghost');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('btn-success');
          btn.classList.add('btn-ghost');
        }, 1500);
      });
    });

    // Edit button
    const editBtn = card.querySelector<HTMLElement>('[data-edit]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        sessionStorage.setItem(
          'badgeforge-clipboard',
          editBtn.getAttribute('data-clipboard') ?? '{}',
        );
        window.location.href = `${import.meta.env.BASE_URL}builder`;
      });
    }
  });
}
