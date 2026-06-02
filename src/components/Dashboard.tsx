import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import BadgeCard from './BadgeCard';
import {
  getAllBadges,
  getAllCategories,
  getCategoryById,
  deleteBadge,
  deleteCategory,
  deleteCategoryAndBadges,
  updateCategory,
  createCategory,
  clearAllBadges,
  clearUserCategories,
  exportBadgesJson,
  importBadgesJson,
  writeClipboard,
  type SavedBadge,
  type UserCategory,
} from '../lib/storage';
import type { BadgeConfig } from './BadgeCard';

export default function Dashboard({ onEditBadge }: { onEditBadge?: (badge: BadgeConfig) => void }) {
  const [badges, setBadges] = useState<SavedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | 'uncategorized' | 'all'>('all');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  // Create category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Modal state
  const [clearAllModal, setClearAllModal] = useState(false);
  const [clearCategoriesToo, setClearCategoriesToo] = useState(false);
  const [deleteCatModal, setDeleteCatModal] = useState<number | null>(null);

  const handleEdit = useCallback(
    (badge: BadgeConfig) => {
      if (onEditBadge) {
        onEditBadge(badge);
      } else {
        writeClipboard({
          label: badge.label,
          message: badge.message,
          color: badge.color,
          logo: badge.logo,
          logoColor: badge.logoColor,
          style: badge.style || 'flat',
          labelColor: badge.labelColor,
          categoryId: badge.categoryId,
        });
        window.location.href = '/builder';
      }
    },
    [onEditBadge],
  );

  const refresh = useCallback(async () => {
    try {
      const [loadedBadges, loadedCategories] = await Promise.all([
        getAllBadges(),
        getAllCategories(),
      ]);
      setBadges(loadedBadges);
      setCategories(loadedCategories);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredBadges = useMemo(() => {
    if (categoryFilter === 'all') return badges;
    if (categoryFilter === 'uncategorized') {
      return badges.filter((b) => b.categoryId === undefined || b.categoryId === null);
    }
    return badges.filter((b) => b.categoryId === categoryFilter);
  }, [badges, categoryFilter]);

  // Only show categories that have at least one badge
  const categoriesWithBadges = useMemo(() => {
    return categories.filter((cat) => badges.some((b) => b.categoryId === cat.id));
  }, [categories, badges]);

  // Resolve category name for a badge
  const getCatName = useCallback(
    (categoryId?: number) => categories.find((c) => c.id === categoryId)?.name,
    [categories],
  );

  const handleDelete = useCallback(async (badge: BadgeConfig) => {
    if (typeof badge.id === 'number') {
      await deleteBadge(badge.id);
      setBadges((prev) => prev.filter((b) => b.id !== badge.id));
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    if (clearCategoriesToo) {
      await clearUserCategories();
    }
    await clearAllBadges();
    setBadges([]);
    setClearAllModal(false);
    setClearCategoriesToo(false);
    setCategoryFilter('all');
    // Reload categories (user-created ones are now gone)
    if (clearCategoriesToo) {
      const remaining = await getAllCategories();
      setCategories(remaining);
    }
  }, [clearCategoriesToo]);

  const handleExport = useCallback(async () => {
    const json = await exportBadgesJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `badgecraft-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await importBadgesJson(text);
        setImportStatus({
          type: 'success',
          msg: `Imported ${count} badge${count !== 1 ? 's' : ''}`,
        });
        await refresh();
      } catch (err) {
        setImportStatus({
          type: 'error',
          msg: `Import failed: ${err instanceof Error ? err.message : 'Invalid file'}`,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setImportStatus(null), 5000);
    },
    [refresh],
  );

  // ── Category management handlers ──────────────────────────
  const handleDeleteCategoryKeepBadges = useCallback(
    async (id: number) => {
      try {
        await deleteCategory(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setBadges((prev) =>
          prev.map((b) => (b.categoryId === id ? { ...b, categoryId: undefined } : b)),
        );
        if (categoryFilter === id) setCategoryFilter('all');
        setDeleteCatModal(null);
        setCatError(null);
      } catch (err) {
        setCatError(err instanceof Error ? err.message : 'Failed to delete category');
      }
    },
    [categoryFilter],
  );

  const handleDeleteCategoryWithBadges = useCallback(async (id: number) => {
    try {
      const count = await deleteCategoryAndBadges(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setBadges((prev) => prev.filter((b) => b.categoryId !== id));
      setDeleteCatModal(null);
      setCatError(null);
      setImportStatus({
        type: 'success',
        msg: `Deleted category and ${count} badge${count !== 1 ? 's' : ''}.`,
      });
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  }, []);

  const handleStartEditCategory = useCallback((cat: UserCategory) => {
    setEditingCategory(cat.id!);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description ?? '');
    setCatError(null);
  }, []);

  const handleSaveCategory = useCallback(
    async (id: number) => {
      try {
        await updateCategory(id, {
          name: editCatName.trim(),
          description: editCatDesc.trim() || undefined,
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, name: editCatName.trim(), description: editCatDesc.trim() } : c,
          ),
        );
        setEditingCategory(null);
        setCatError(null);
      } catch (err) {
        setCatError(err instanceof Error ? err.message : 'Failed to update category');
      }
    },
    [editCatName, editCatDesc],
  );

  const handleCreateCategory = useCallback(async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    try {
      const id = await createCategory(trimmed, undefined, newCatDesc.trim() || undefined);
      const newCat = await getCategoryById(id);
      if (newCat) setCategories((prev) => [...prev, newCat]);
      setNewCatName('');
      setNewCatDesc('');
      setCatError(null);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Failed to create category');
    }
  }, [newCatName, newCatDesc]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Backpack</h2>
          <p className="text-base-content/60 text-sm">
            {filteredBadges.length} badge{filteredBadges.length !== 1 ? 's' : ''}
            {categoryFilter !== 'all' ? ' in this category' : ' saved locally'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            className="btn btn-sm btn-outline gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            className="btn btn-sm btn-outline gap-1"
            onClick={handleExport}
            disabled={badges.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            className="btn btn-sm btn-ghost text-error"
            onClick={() => setClearAllModal(true)}
            disabled={badges.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Import alert */}
      {importStatus && (
        <div
          className={`alert ${importStatus.type === 'success' ? 'alert-success' : 'alert-error'} max-w-lg`}
        >
          <span>{importStatus.msg}</span>
        </div>
      )}

      {/* Manage Categories */}
      <div>
        <button
          className="btn btn-sm btn-ghost gap-1"
          onClick={() => setShowCategoryManager(!showCategoryManager)}
        >
          {showCategoryManager ? 'Hide' : 'Manage'} Categories
          <span className="badge badge-xs">{categories.filter((c) => !c.readonly).length}</span>
        </button>

        {showCategoryManager && (
          <div className="mt-3 card bg-base-200 border border-base-300">
            <div className="card-body p-3 gap-3">
              {catError && (
                <div className="alert alert-error alert-soft text-sm py-2">
                  <span>{catError}</span>
                  <button className="btn btn-xs btn-ghost" onClick={() => setCatError(null)}>
                    Dismiss
                  </button>
                </div>
              )}

              {/* Create new category form */}
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1">
                  <input
                    className="input input-bordered input-sm w-full"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category name"
                  />
                </div>
                <div className="flex-1 hidden sm:block">
                  <input
                    className="input input-bordered input-sm w-full"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Description (optional)"
                  />
                </div>
                <button
                  className="btn btn-xs btn-primary shrink-0"
                  onClick={handleCreateCategory}
                  disabled={!newCatName.trim()}
                >
                  Add
                </button>
              </div>

              {categories.filter((c) => !c.readonly).length === 0 ? (
                <p className="text-sm text-base-content/50">
                  No custom categories yet. Create one above or they will be seeded from the gallery
                  on your next visit to the builder.
                </p>
              ) : (
                <div className="divide-y divide-base-300">
                  {categories
                    .filter((c) => !c.readonly)
                    .map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                      >
                        {editingCategory === cat.id ? (
                          <div className="flex flex-col sm:flex-row gap-2 flex-1 mr-2">
                            <input
                              className="input input-bordered input-sm flex-1"
                              value={editCatName}
                              onChange={(e) => setEditCatName(e.target.value)}
                              placeholder="Category name"
                            />
                            <input
                              className="input input-bordered input-sm flex-1"
                              value={editCatDesc}
                              onChange={(e) => setEditCatDesc(e.target.value)}
                              placeholder="Description (optional)"
                            />
                            <div className="flex gap-1">
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={() => handleSaveCategory(cat.id!)}
                                disabled={!editCatName.trim()}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => setEditingCategory(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate">{cat.name}</span>
                              {cat.description && (
                                <span className="text-xs text-base-content/40 truncate hidden sm:inline">
                                  — {cat.description}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => handleStartEditCategory(cat)}
                                title="Edit category"
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-xs btn-ghost text-error"
                                onClick={() => setDeleteCatModal(cat.id!)}
                                title="Delete category"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div role="tablist" className="tabs tabs-lift">
          <label className={`tab ${categoryFilter === 'all' ? 'tab-active' : ''}`}>
            <input
              type="radio"
              name="category_filter"
              className="tab hidden"
              checked={categoryFilter === 'all'}
              onChange={() => setCategoryFilter('all')}
            />
            All
          </label>
          <label className={`tab ${categoryFilter === 'uncategorized' ? 'tab-active' : ''}`}>
            <input
              type="radio"
              name="category_filter"
              className="tab hidden"
              checked={categoryFilter === 'uncategorized'}
              onChange={() => setCategoryFilter('uncategorized')}
            />
            Uncategorized
          </label>
          {categoriesWithBadges.map((cat) => (
            <label key={cat.id} className={`tab ${categoryFilter === cat.id ? 'tab-active' : ''}`}>
              <input
                type="radio"
                name="category_filter"
                className="tab hidden"
                checked={categoryFilter === cat.id}
                onChange={() => setCategoryFilter(cat.id!)}
              />
              {cat.name}
            </label>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-4 gap-3">
                <div className="skeleton h-6 w-32" />
                <div className="skeleton h-14 w-full" />
                <div className="skeleton h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎒</div>
          <h3 className="text-xl font-semibold mb-2">Your backpack is empty</h3>
          <p className="text-base-content/60 mb-6">
            Create badges in the Live Studio or import a snapshot.
          </p>
          <a href="/builder" className="btn btn-primary">
            Go to Live Studio
          </a>
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No badges in this category</h3>
          <p className="text-base-content/60 mb-6">
            Try a different category filter or create new badges.
          </p>
          <button className="btn btn-ghost" onClick={() => setCategoryFilter('all')}>
            Show All
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={{
                id: badge.id,
                label: badge.label,
                message: badge.message,
                color: badge.color,
                logo: badge.logo,
                logoColor: badge.logoColor,
                style: badge.style,
                labelColor: badge.labelColor,
                name: badge.name,
                savedAt: badge.savedAt,
                categoryId: badge.categoryId,
                categoryName: getCatName(badge.categoryId),
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Clear All Modal ─────────────────────────── */}
      <dialog className={`modal ${clearAllModal ? 'modal-open' : ''}`}>
        <div className="modal-box flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold">Clear all badges</h3>
            <p className="text-sm text-base-content/60">
              This will permanently delete all <strong>{badges.length}</strong> badge
              {badges.length !== 1 ? 's' : ''}. This action cannot be undone — consider exporting a
              backup first.
            </p>
          </div>

          {(() => {
            const userCatCount = categories.filter((c) => !c.readonly).length;
            if (userCatCount === 0) return null;
            return (
              <label className="fieldset-label flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-warning"
                  checked={clearCategoriesToo}
                  onChange={(e) => setClearCategoriesToo(e.target.checked)}
                />
                <span className="text-sm">
                  Also delete{' '}
                  <strong>
                    {userCatCount} user-created categor{userCatCount !== 1 ? 'ies' : 'y'}
                  </strong>
                  <br />
                  <span className="text-base-content/50 text-xs">
                    Badges in them will be moved to Uncategorized
                  </span>
                </span>
              </label>
            );
          })()}

          <div className="modal-action">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setClearAllModal(false);
                setClearCategoriesToo(false);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-error btn-sm" onClick={handleClearAll}>
              Delete{clearCategoriesToo ? ' All' : ' Badges'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button
            onClick={() => {
              setClearAllModal(false);
              setClearCategoriesToo(false);
            }}
          >
            close
          </button>
        </form>
      </dialog>

      {/* ── Delete Category Modal ────────────────────── */}
      <dialog className={`modal ${deleteCatModal !== null ? 'modal-open' : ''}`}>
        <div className="modal-box flex flex-col gap-5">
          {deleteCatModal !== null &&
            (() => {
              const catName =
                categories.find((c) => c.id === deleteCatModal)?.name ?? 'this category';
              const badgeCount = badges.filter((b) => b.categoryId === deleteCatModal).length;
              if (badgeCount === 0) {
                return (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-bold">Delete {catName}</h3>
                      <p className="text-sm text-base-content/60">
                        This category is empty. Delete it permanently?
                      </p>
                    </div>
                    <div className="modal-action">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleteCatModal(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleDeleteCategoryKeepBadges(deleteCatModal!)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                );
              }
              return (
                <>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold">Delete {catName}</h3>
                    <p className="text-sm text-base-content/60">
                      Contains{' '}
                      <strong>
                        {badgeCount} badge{badgeCount !== 1 ? 's' : ''}
                      </strong>
                      . Choose what to do with them:
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      className="btn btn-outline btn-sm justify-start"
                      onClick={() => handleDeleteCategoryKeepBadges(deleteCatModal!)}
                    >
                      Move badges to Uncategorized
                    </button>
                    <button
                      className="btn btn-error btn-outline btn-sm justify-start"
                      onClick={() => handleDeleteCategoryWithBadges(deleteCatModal!)}
                    >
                      Delete all {badgeCount} badge{badgeCount !== 1 ? 's' : ''} permanently
                    </button>
                  </div>
                  <div className="modal-action">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeleteCatModal(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setDeleteCatModal(null)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
