/**
 * Client-side interactions for GalleryBadgeDetail: save to My Badges, edit in Forge.
 * Uses event delegation on document — works with ClientRouter SPA navigation.
 */

import {
  getAllCategories,
  isDuplicate,
  saveBadge,
  seedDefaultCategories,
  type BadgeClipboard,
} from './storage';

interface SaveButtonState {
  /** True when the badge is confirmed saved in Dexie (disables the button). */
  saved: boolean;
  /** Timer handle for "Saved!" → "Added to My Badges" transition. */
  revertTimer: ReturnType<typeof setTimeout> | null;
}

/** Per-button state keyed by the save button element. */
const saveStates = new WeakMap<HTMLElement, SaveButtonState>();

function parseClipboard(el: Element): BadgeClipboard {
  const raw = (el.getAttribute('data-clipboard') || '{}').replace(/&quot;/g, '"');
  return JSON.parse(raw) as BadgeClipboard;
}

function setButtonSaved(btn: HTMLElement): void {
  btn.classList.add('btn-disabled');
  btn.innerHTML = 'Added to My Badges';
  const state = saveStates.get(btn);
  if (state) {
    state.saved = true;
    if (state.revertTimer) {
      clearTimeout(state.revertTimer);
      state.revertTimer = null;
    }
  }
}

function setButtonSaving(btn: HTMLElement): void {
  btn.classList.add('btn-disabled');
  btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Adding…';
}

function setButtonSavedFeedback(btn: HTMLElement): void {
  btn.classList.add('btn-success');
  btn.classList.remove('btn-disabled');
  btn.innerHTML = '<svg class="w-3.5 h-3.5"><use href="#ai:lucide:check"/></svg> Saved!';

  const state = saveStates.get(btn);
  if (state) {
    if (state.revertTimer) clearTimeout(state.revertTimer);
    state.revertTimer = setTimeout(() => {
      btn.classList.remove('btn-success');
      setButtonSaved(btn);
    }, 2000);
  }
}

function setButtonAlreadySaved(btn: HTMLElement): void {
  btn.classList.add('btn-disabled');
  btn.innerHTML = 'Added to My Badges';
}

async function handleSave(saveBtn: HTMLElement): Promise<void> {
  // If already in saved state, do nothing
  const state = saveStates.get(saveBtn);
  if (state?.saved) return;

  // Prevent double-clicks
  setButtonSaving(saveBtn);

  const slug = saveBtn.getAttribute('data-dexie-slug') || '';
  try {
    await seedDefaultCategories();
    const cats = await getAllCategories();
    const match = cats.find((c) => c.slug === slug);
    const categoryId = match?.id;
    const data = parseClipboard(saveBtn);

    const dup = await isDuplicate({
      label: data.label,
      message: data.message,
      color: data.color,
      logo: data.logo || '',
      logoColor: data.logoColor || '',
      logoSize: data.logoSize || '',
      style: data.style || 'flat',
      labelColor: data.labelColor || '',
      categoryId,
    });

    if (dup) {
      setButtonAlreadySaved(saveBtn);
      return;
    }

    await saveBadge({
      label: data.label,
      message: data.message,
      color: data.color,
      logo: data.logo || '',
      logoColor: data.logoColor || '',
      logoSize: data.logoSize || '',
      style: data.style || 'flat',
      labelColor: data.labelColor || '',
      name: '',
      categoryId,
    });

    setButtonSavedFeedback(saveBtn);
  } catch {
    // Restore on error
    saveBtn.classList.remove('btn-disabled');
    saveBtn.innerHTML =
      '<svg class="w-3.5 h-3.5"><use href="#ai:lucide:bookmark"/></svg> Add to My Badges';
  }
}

function handleEdit(editBtn: HTMLElement): void {
  sessionStorage.setItem(
    'badgeforge-clipboard',
    editBtn.getAttribute('data-clipboard')?.replace(/&quot;/g, '"') || '{}',
  );
  window.location.href = import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'forge';
}

/**
 * Check if a badge is already saved and update the button accordingly.
 * Called on page load to set initial button state.
 */
export async function initSaveButtonState(): Promise<void> {
  if (typeof window === 'undefined') return;

  const saveBtns = document.querySelectorAll<HTMLElement>('[data-save-badge]');
  for (const btn of saveBtns) {
    // Initialize state
    if (!saveStates.has(btn)) {
      saveStates.set(btn, { saved: false, revertTimer: null });
    }

    const slug = btn.getAttribute('data-dexie-slug') || '';
    try {
      await seedDefaultCategories();
      const cats = await getAllCategories();
      const match = cats.find((c) => c.slug === slug);
      const categoryId = match?.id;
      const data = parseClipboard(btn);

      const dup = await isDuplicate({
        label: data.label,
        message: data.message,
        color: data.color,
        logo: data.logo || '',
        logoColor: data.logoColor || '',
        logoSize: data.logoSize || '',
        style: data.style || 'flat',
        labelColor: data.labelColor || '',
        categoryId,
      });

      if (dup) {
        setButtonAlreadySaved(btn);
      }
    } catch {
      // If check fails, leave button in default state
    }
  }
}

/**
 * Initialize event listeners for gallery detail actions (save + edit).
 * Uses astro:page-load for ClientRouter SPA navigation support.
 */
export function initGalleryDetailActions(): void {
  if (typeof window === 'undefined') return;

  function attach(): void {
    // Save button
    document.querySelectorAll<HTMLElement>('[data-save-badge]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        void handleSave(btn);
      });
    });
  }

  // Attach on initial load and after ClientRouter navigation
  attach();
  document.addEventListener('astro:page-load', attach);
}
