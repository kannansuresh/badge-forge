/**
 * Browser-only DOM utilities for React islands.
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
