import { useState, useEffect, useCallback, useRef } from 'react';
import BadgeCard from './BadgeCard';
import {
  getAllBadges,
  deleteBadge,
  clearAllBadges,
  exportBadgesJson,
  importBadgesJson,
  writeClipboard,
  type SavedBadge,
} from '../lib/storage';
import type { BadgeConfig } from './BadgeCard';

export default function Dashboard({ onEditBadge }: { onEditBadge?: (badge: BadgeConfig) => void }) {
  const [badges, setBadges] = useState<SavedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        });
        window.location.href = '/builder';
      }
    },
    [onEditBadge],
  );

  const refresh = useCallback(async () => {
    try {
      setBadges(await getAllBadges());
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (badge: BadgeConfig) => {
    if (typeof badge.id === 'number') {
      await deleteBadge(badge.id);
      setBadges((prev) => prev.filter((b) => b.id !== badge.id));
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    await clearAllBadges();
    setBadges([]);
    setConfirmClear(false);
  }, []);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Backpack</h2>
          <p className="text-base-content/60 text-sm">
            {badges.length} badge{badges.length !== 1 ? 's' : ''} saved locally
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
          <button className="btn btn-sm btn-outline" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleExport}
            disabled={badges.length === 0}
          >
            Export
          </button>
          {!confirmClear ? (
            <button
              className="btn btn-sm btn-ghost text-error"
              onClick={() => setConfirmClear(true)}
              disabled={badges.length === 0}
            >
              Clear All
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-error">Sure?</span>
              <button className="btn btn-sm btn-error" onClick={handleClearAll}>
                Yes
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirmClear(false)}>
                No
              </button>
            </div>
          )}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {badges.map((badge) => (
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
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
