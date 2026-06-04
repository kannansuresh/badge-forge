import { Download, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAllBadges,
  clearUserCategories,
  deleteBadge,
  exportBadgesJson,
  getAllBadges,
  getAllCategories,
  importBadgesJson,
  writeClipboard,
  type SavedBadge,
  type UserCategory,
} from '../lib/storage';
import type { BadgeConfig } from './BadgeCard';
import BadgeCard from './BadgeCard';

export default function Dashboard({ onEditBadge }: { onEditBadge?: (badge: BadgeConfig) => void }) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [badges, setBadges] = useState<SavedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | 'uncategorized' | 'all'>('all');

  // Modal state
  const [clearAllModal, setClearAllModal] = useState(false);
  const [clearCategoriesToo, setClearCategoriesToo] = useState(false);

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
        window.location.href = `${base}forge`;
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
    a.download = `badgeforge-export-${new Date().toISOString().slice(0, 10)}.json`;
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Badges</h2>
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
          <a href={`${base}categories`} className="btn btn-sm btn-outline gap-1">
            Manage Categories
          </a>
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
            Create badges in the Forge or import a snapshot.
          </p>
          <a href={`${base}forge`} className="btn btn-primary">
            Go to Forge
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
    </div>
  );
}
