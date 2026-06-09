import {
  getBadgeById,
  deleteBadge,
  getAllCategories,
  writeClipboard,
  buildShieldsUrl,
  type SavedBadge,
} from './storage';
import { COPY_FORMATS, getSnippet } from './formats';

export async function initUserBadgeDetail(): Promise<void> {
  if (typeof window === 'undefined') return;

  const container = document.getElementById('badge-detail-container');
  if (!container) return;

  const loadingEl = document.getElementById('detail-loading');
  const notFoundEl = document.getElementById('detail-not-found');
  const deletedEl = document.getElementById('detail-deleted');
  const contentEl = document.getElementById('detail-content');

  // Base path helper
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

  // Setup My Badges links
  container
    .querySelectorAll('[data-link-my-badges], [data-link-my-badges-nf], [data-link-my-badges-del]')
    .forEach((link) => {
      link.setAttribute('href', `${base}my-badges`);
    });

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id') || '', 10);

  if (isNaN(id) || id <= 0) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (notFoundEl) notFoundEl.classList.remove('hidden');
    return;
  }

  let badge: SavedBadge | undefined;
  try {
    badge = await getBadgeById(id);
  } catch (err) {
    console.error('Failed to load badge:', err);
  }

  if (!badge) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (notFoundEl) notFoundEl.classList.remove('hidden');
    return;
  }

  // We have the badge! Now populate the detail view.
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

  // 1. Update Preview Image
  const img = contentEl?.querySelector('[data-zoom-img]') as HTMLImageElement | null;
  if (img) {
    img.src = shieldsUrl;
    img.alt = `${badge.label}: ${badge.message}`;
    img.onerror = () => {
      if (img.parentElement) {
        img.parentElement.innerHTML = `<span class="font-mono text-sm text-base-content/50">${badge!.label}-${badge!.message}-${badge!.color}</span>`;
      }
    };
  }

  // 2. Title & Subtitle
  const titleEl = contentEl?.querySelector('h1');
  if (titleEl) {
    titleEl.textContent = badge.name || `${badge.label}: ${badge.message}`;
  }

  const subtitleEl = document.getElementById('badge-subtitle');
  if (subtitleEl) {
    if (badge.savedAt) {
      subtitleEl.textContent = `Saved ${new Date(badge.savedAt).toLocaleDateString()}`;
    } else {
      subtitleEl.textContent = 'Saved badge';
    }
  }

  // 3. Category
  if (badge.categoryId) {
    try {
      const cats = await getAllCategories();
      const category = cats.find((c) => c.id === badge!.categoryId);
      if (category && subtitleEl) {
        subtitleEl.innerHTML += ` · <span class="badge badge-xs badge-primary badge-outline">${category.name}</span>`;
      }
    } catch (err) {
      console.error('Failed to resolve category:', err);
    }
  }

  // 4. Metadata
  // Color Swatch
  const colorSwatch = contentEl?.querySelector('[style*="background-color"]') as HTMLElement | null;
  if (colorSwatch) {
    colorSwatch.style.backgroundColor = `#${badge.color}`;
  }
  const colorText = contentEl?.querySelector('.font-mono.text-xs') as HTMLElement | null;
  if (colorText) {
    colorText.textContent = `#${badge.color}`;
  }

  // Logo badge
  const logoBadge = contentEl?.querySelector('.badge-ghost') as HTMLElement | null;
  if (logoBadge) {
    if (badge.logo) {
      logoBadge.textContent = badge.logo;
      logoBadge.classList.remove('hidden');
    } else {
      logoBadge.classList.add('hidden');
    }
  }

  // Style badge
  const styleBadge = contentEl?.querySelector('.badge-outline') as HTMLElement | null;
  if (styleBadge) {
    styleBadge.textContent = badge.style || 'flat';
  }

  // Label Color Swatch
  const labelColorSpan = Array.from(contentEl?.querySelectorAll('.flex-wrap span') || []).find(
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

  // 5. Update Embed Snippets
  for (const { key } of COPY_FORMATS) {
    const snippet = getSnippet(key, shieldsUrl, badge.name || badge.message);
    const copyBtn = contentEl?.querySelector(`[data-copy="${key}"]`);
    if (copyBtn) {
      const parent = copyBtn.closest('.bg-base-200');
      const pre = parent?.querySelector('pre');
      if (pre) {
        pre.textContent = snippet;
      }
    }
  }

  // 6. Edit Button Action
  const editBtn = contentEl?.querySelector('[data-edit-user-badge]');
  if (editBtn) {
    const newEditBtn = editBtn.cloneNode(true) as HTMLButtonElement;
    editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
    newEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      writeClipboard({
        label: badge!.label,
        message: badge!.message,
        color: badge!.color,
        logo: badge!.logo || undefined,
        logoColor: badge!.logoColor || undefined,
        logoSize: badge!.logoSize || undefined,
        style: badge!.style || 'flat',
        labelColor: badge!.labelColor || undefined,
        categoryId: badge!.categoryId,
      });
      window.location.href = `${base}forge`;
    });
  }

  // 7. Delete Button Action
  const deleteBtn = contentEl?.querySelector('[data-delete-user-badge]');
  const deleteModal = document.getElementById('delete-confirm-modal') as HTMLDialogElement | null;

  if (deleteBtn && deleteModal) {
    const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
    deleteBtn.parentNode?.replaceChild(newDeleteBtn, deleteBtn);

    newDeleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalText = deleteModal.querySelector('#delete-confirm-text');
      if (modalText) {
        modalText.innerHTML = `Delete &quot;${badge!.name || `${badge!.label}: ${badge!.message}`}&quot;?`;
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
          if (contentEl) contentEl.classList.add('hidden');
          if (deletedEl) deletedEl.classList.remove('hidden');
        } catch (err) {
          console.error('Failed to delete badge:', err);
        }
      });
    }
  }

  // Finally, hide loader and show content!
  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');
}
