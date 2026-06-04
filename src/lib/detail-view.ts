/**
 * Client-side interactions for BadgeDetailView: zoom toggle, copy to clipboard, embed expand.
 * Uses event delegation on document — works with ClientRouter SPA navigation.
 */

import { copyToClipboard } from './dom';

interface DetailViewElements {
  zoomImg: HTMLElement | null;
  zoomControls: HTMLElement | null;
  expandedCode: HTMLElement | null;
  expandToggle: HTMLElement | null;
}

function getDetailViewElements(): DetailViewElements {
  return {
    zoomImg: document.querySelector('[data-zoom-img]') as HTMLElement | null,
    zoomControls: document.querySelector('[data-zoom-controls]') as HTMLElement | null,
    expandedCode: document.querySelector('[data-expanded-code]') as HTMLElement | null,
    expandToggle: document.querySelector('[data-expand-toggle]') as HTMLElement | null,
  };
}

function handleZoom(zoomBtn: HTMLElement): void {
  const zoom = parseInt(zoomBtn.getAttribute('data-zoom') || '1', 10);
  const { zoomImg } = getDetailViewElements();
  if (zoomImg) {
    zoomImg.style.transform = `scale(${zoom})`;
  }
  zoomBtn.parentElement?.querySelectorAll('[data-zoom]').forEach((b) => {
    b.classList.toggle('btn-active', b === zoomBtn);
    b.classList.toggle('btn-ghost', b !== zoomBtn);
  });
}

async function handleCopy(copyBtn: HTMLElement): Promise<void> {
  const key = copyBtn.getAttribute('data-copy');
  if (!key) return;

  const pre = document
    .querySelector(`[data-expanded-code] [data-copy="${key}"]`)
    ?.closest('.bg-base-200')
    ?.querySelector('code');
  const text = pre?.textContent || '';
  if (!text) return;

  await copyToClipboard(text);

  const origHTML = copyBtn.innerHTML;
  copyBtn.innerHTML = '<svg class="w-3 h-3"><use href="#ai:lucide:check"/></svg> Copied';
  copyBtn.classList.add('btn-success');
  copyBtn.classList.remove('btn-outline', 'btn-ghost');
  setTimeout(() => {
    copyBtn.innerHTML = origHTML;
    copyBtn.classList.remove('btn-success');
    copyBtn.classList.add('btn-outline');
  }, 2000);
}

function handleExpand(expandToggle: HTMLElement): void {
  const { expandedCode } = getDetailViewElements();
  if (expandedCode) {
    const isHidden = expandedCode.classList.toggle('hidden');
    expandToggle.textContent = isHidden ? 'All formats' : 'Show less';
  }
}

/**
 * Initialize event delegation for the badge detail view.
 * Call once on page load — the document-level listener persists
 * across ClientRouter navigations.
 */
export function initDetailView(): void {
  if (typeof window === 'undefined') return;

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Zoom toggle
    const zoomBtn = target.closest<HTMLElement>('[data-zoom]');
    if (zoomBtn) {
      handleZoom(zoomBtn);
      return;
    }

    // Copy to clipboard
    const copyBtn = target.closest<HTMLElement>('[data-copy]');
    if (copyBtn) {
      void handleCopy(copyBtn);
      return;
    }

    // Expand/collapse embed formats
    const expandToggle = target.closest<HTMLElement>('[data-expand-toggle]');
    if (expandToggle) {
      handleExpand(expandToggle);
    }
  });
}
