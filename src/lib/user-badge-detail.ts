import {
  getBadgeById,
  deleteBadge,
  getAllCategories,
  writeClipboard,
  buildShieldsUrl,
  type SavedBadge,
} from './storage';
import { COPY_FORMATS, getSnippet } from './formats';

function setupLinks(container: HTMLElement, base: string): void {
  container
    .querySelectorAll('[data-link-my-badges], [data-link-my-badges-nf], [data-link-my-badges-del]')
    .forEach((link) => {
      link.setAttribute('href', `${base}my-badges`);
    });
}

function updatePreviewAndHeader(
  contentEl: HTMLElement,
  badge: SavedBadge,
  shieldsUrl: string,
): void {
  const img = contentEl.querySelector('[data-zoom-img]') as HTMLImageElement | null;
  if (img) {
    img.src = shieldsUrl;
    img.alt = `${badge.label}: ${badge.message}`;
    img.onerror = () => {
      if (img.parentElement) {
        img.parentElement.innerHTML = `<span class="font-mono text-sm text-base-content/50">${badge.label}-${badge.message}-${badge.color}</span>`;
      }
    };
  }

  const titleEl = contentEl.querySelector('h1');
  if (titleEl) {
    titleEl.textContent = badge.name || `${badge.label}: ${badge.message}`;
  }
}

async function updateSubtitleAndCategory(badge: SavedBadge): Promise<void> {
  const subtitleEl = document.getElementById('badge-subtitle');
  if (!subtitleEl) return;

  if (badge.savedAt) {
    subtitleEl.textContent = `Saved ${new Date(badge.savedAt).toLocaleDateString()}`;
  } else {
    subtitleEl.textContent = 'Saved badge';
  }

  if (badge.categoryId) {
    try {
      const cats = await getAllCategories();
      const category = cats.find((c) => c.id === badge.categoryId);
      if (category) {
        subtitleEl.innerHTML += ` · <span class="badge badge-xs badge-primary badge-outline">${category.name}</span>`;
      }
    } catch (err) {
      console.error('Failed to resolve category:', err);
    }
  }
}

function updateMetadata(contentEl: HTMLElement, badge: SavedBadge): void {
  const colorSwatch = contentEl.querySelector('[style*="background-color"]') as HTMLElement | null;
  if (colorSwatch) {
    colorSwatch.style.backgroundColor = `#${badge.color}`;
  }
  const colorText = contentEl.querySelector('.font-mono.text-xs') as HTMLElement | null;
  if (colorText) {
    colorText.textContent = `#${badge.color}`;
  }

  const logoBadge = contentEl.querySelector('.badge-ghost') as HTMLElement | null;
  if (logoBadge) {
    if (badge.logo) {
      logoBadge.textContent = badge.logo;
      logoBadge.classList.remove('hidden');
    } else {
      logoBadge.classList.add('hidden');
    }
  }

  const styleBadge = contentEl.querySelector('.badge-outline') as HTMLElement | null;
  if (styleBadge) {
    styleBadge.textContent = badge.style || 'flat';
  }

  const labelColorSpan = Array.from(contentEl.querySelectorAll('.flex-wrap span') || []).find(
    (span) => span.textContent?.includes('label #'),
  ) as HTMLElement | null;

  if (labelColorSpan) {
    if (badge.labelColor) {
      labelColorSpan.classList.remove('hidden');
      const swatch = labelColorSpan.querySelector('span') as HTMLElement | null;
      if (swatch) {
        swatch.style.backgroundColor = `#${badge.labelColor}`;
      }
      const text = labelColorSpan.querySelector('.text-xs') as HTMLElement | null;
      if (text) {
        text.textContent = `label #${badge.labelColor}`;
      }
    } else {
      labelColorSpan.classList.add('hidden');
    }
  }
}

function updateEmbedSnippets(contentEl: HTMLElement, badge: SavedBadge, shieldsUrl: string): void {
  for (const { key } of COPY_FORMATS) {
    const snippet = getSnippet(key, shieldsUrl, badge.name || badge.message);
    const copyBtn = contentEl.querySelector(`[data-copy="${key}"]`);
    if (copyBtn) {
      const parent = copyBtn.closest('.bg-base-200');
      const pre = parent?.querySelector('pre');
      if (pre) {
        pre.textContent = snippet;
      }
    }
  }
}

function bindEditAction(contentEl: HTMLElement, badge: SavedBadge, base: string): void {
  const editBtn = contentEl.querySelector('[data-edit-user-badge]');
  if (editBtn) {
    const newEditBtn = editBtn.cloneNode(true) as HTMLButtonElement;
    editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
    newEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      writeClipboard({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo || undefined,
        logoColor: badge.logoColor || undefined,
        logoSize: badge.logoSize || undefined,
        style: badge.style || 'flat',
        labelColor: badge.labelColor || undefined,
        categoryId: badge.categoryId,
      });
      window.location.href = `${base}forge`;
    });
  }
}

function bindDeleteAction(
  contentEl: HTMLElement,
  id: number,
  badgeName: string,
  deletedEl: HTMLElement | null,
): void {
  const deleteBtn = contentEl.querySelector('[data-delete-user-badge]');
  const deleteModal = document.getElementById('delete-confirm-modal') as HTMLDialogElement | null;

  if (deleteBtn && deleteModal) {
    const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
    deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);

    newDeleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalText = deleteModal.querySelector('#delete-confirm-text');
      if (modalText) {
        modalText.innerHTML = `Delete &quot;${badgeName}&quot;?`;
      }
      deleteModal.showModal();
    });

    const cancelBtn = deleteModal.querySelector('[data-cancel-delete]');
    cancelBtn?.addEventListener('click', () => {
      deleteModal.close();
    });

    const confirmBtn = deleteModal.querySelector('[data-confirm-delete-btn]');
    if (confirmBtn) {
      const newConfirmBtn = confirmBtn.cloneNode(true) as HTMLButtonElement;
      confirmBtn.parentNode?.replaceChild(newConfirmBtn, confirmBtn);

      newConfirmBtn.addEventListener('click', async () => {
        try {
          await deleteBadge(id);
          deleteModal.close();
          contentEl.classList.add('hidden');
          if (deletedEl) deletedEl.classList.remove('hidden');
        } catch (err) {
          console.error('Failed to delete badge:', err);
        }
      });
    }
  }
}

function showErrorState(loadingEl: HTMLElement | null, notFoundEl: HTMLElement | null): void {
  if (loadingEl) loadingEl.classList.add('hidden');
  if (notFoundEl) notFoundEl.classList.remove('hidden');
}

async function fetchBadge(id: number): Promise<SavedBadge | undefined> {
  try {
    return await getBadgeById(id);
  } catch (err) {
    console.error('Failed to load badge:', err);
    return undefined;
  }
}

async function renderBadgeContent(
  contentEl: HTMLElement,
  badge: SavedBadge,
  shieldsUrl: string,
  base: string,
  id: number,
): Promise<void> {
  updatePreviewAndHeader(contentEl, badge, shieldsUrl);
  await updateSubtitleAndCategory(badge);
  updateMetadata(contentEl, badge);
  updateEmbedSnippets(contentEl, badge, shieldsUrl);
  bindEditAction(contentEl, badge, base);
  bindDeleteAction(
    contentEl,
    id,
    badge.name || `${badge.label}: ${badge.message}`,
    document.getElementById('detail-deleted'),
  );
}

export async function initUserBadgeDetail(): Promise<void> {
  if (typeof window === 'undefined') return;

  const container = document.getElementById('badge-detail-container');
  if (!container) return;

  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  setupLinks(container, base);

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id') || '', 10);

  const loadingEl = document.getElementById('detail-loading');
  const notFoundEl = document.getElementById('detail-not-found');

  if (isNaN(id) || id <= 0) {
    showErrorState(loadingEl, notFoundEl);
    return;
  }

  const badge = await fetchBadge(id);
  if (!badge) {
    showErrorState(loadingEl, notFoundEl);
    return;
  }

  const shieldsUrl = buildShieldsUrl({
    label: badge.label,
    message: badge.message,
    color: badge.color,
    logo: badge.logo || undefined,
    logoColor: badge.logoColor || undefined,
    logoSize: badge.logoSize || undefined,
    style: badge.style || 'flat',
    labelColor: badge.labelColor || undefined,
  });

  const contentEl = document.getElementById('detail-content');
  if (contentEl) {
    await renderBadgeContent(contentEl, badge, shieldsUrl, base, id);
    contentEl.classList.remove('hidden');
  }

  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }
}

