import { useState, useEffect, useCallback, useRef } from 'react';
import BadgeCard from './BadgeCard';
import {
  getAllBadges,
  deleteBadge,
  clearAllBadges,
  exportBadgesJson,
  importBadgesJson,
  type SavedBadge,
} from '../lib/storage';
import type { BadgeConfig } from './BadgeCard';

interface DashboardProps {
  /** Callback to navigate to builder with a specific badge config */
  onEditBadge?: (badge: BadgeConfig) => void;
}

export default function Dashboard({ onEditBadge }: DashboardProps) {
  const [badges, setBadges] = useState<SavedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const all = await getAllBadges();
      setBadges(all);
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    async (badge: BadgeConfig) => {
      if (badge.id !== undefined && typeof badge.id === 'number') {
        await deleteBadge(badge.id as number);
        setBadges((prev) => prev.filter((b) => b.id !== badge.id));
      }
    },
    [],
  );

  const handleClearAll = useCallback(async () => {
    await clearAllBadges();
    setBadges([]);
    setConfirmClear(false);
  }, []);

  const handleExport = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const count = await importBadgesJson(text);
        setImportStatus({ type: 'success', msg: `Imported ${count} badge${count !== 1 ? 's' : ''} successfully!` });
        await refresh();
      } catch (err) {
        setImportStatus({
          type: 'error',
          msg: `Import failed: ${err instanceof Error ? err.message : 'Invalid file'}`,
        });
      }

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setImportStatus(null), 5000);
    },
    [refresh],
  );

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Backpack</h2>
          <p className="text-base-content/60 text-sm">
            {badges.length} badge{badges.length !== 1 ? 's' : ''} saved locally
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
            id="import-file"
          />
          <button
            className="btn btn-sm btn-outline gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>

          {/* Export */}
          <button
            className="btn btn-sm btn-outline gap-1"
            onClick={handleExport}
            disabled={badges.length === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>

          {/* Clear All */}
          {!confirmClear ? (
            <button
              className="btn btn-sm btn-ghost text-error gap-1"
              onClick={() => setConfirmClear(true)}
              disabled={badges.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-error">Are you sure?</span>
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

      {/* Import status toast */}
      {importStatus && (
        <div className={`alert ${importStatus.type === 'success' ? 'alert-success' : 'alert-error'} max-w-lg`}>
          <span>{importStatus.msg}</span>
        </div>
      )}

      {/* Badges grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-5 gap-3">
                <div className="skeleton h-6 w-32" />
                <div className="skeleton h-20 w-full" />
                <div className="skeleton h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎒</div>
          <h3 className="text-xl font-semibold mb-2">Your backpack is empty</h3>
          <p className="text-base-content/60 mb-6 max-w-md mx-auto">
            Badges you create and save in the Live Studio will appear here.
            Or import a snapshot from another device.
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
                id: String(badge.id),
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
              onEdit={onEditBadge}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
