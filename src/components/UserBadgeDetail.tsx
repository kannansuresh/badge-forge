import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  Pencil,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { COPY_FORMATS, downloadSvg, getSnippet, type CopyFormatKey } from '../lib/formats';
import {
  buildShieldsUrl,
  deleteBadge,
  getAllCategories,
  getBadgeById,
  writeClipboard,
  type SavedBadge,
  type UserCategory,
} from '../lib/storage';

export default function UserBadgeDetail() {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [badge, setBadge] = useState<SavedBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState<UserCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<CopyFormatKey | null>(null);
  const [imgError, setImgError] = useState(false);
  const [expandCode, setExpandCode] = useState(false);
  const [zoom, setZoom] = useState<1 | 2>(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id') || '', 10);
    if (isNaN(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const b = await getBadgeById(id);
        if (!b) {
          setNotFound(true);
          return;
        }
        setBadge(b);
        if (b.categoryId) {
          const cats = await getAllCategories();
          setCategory(cats.find((c) => c.id === b.categoryId) ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shieldsUrl = badge
    ? buildShieldsUrl({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo || undefined,
        logoColor: badge.logoColor || undefined,
        style: badge.style || 'flat',
        labelColor: badge.labelColor || undefined,
      })
    : '';
  const copy = useCallback(
    async (f: CopyFormatKey) => {
      const t = getSnippet(f, shieldsUrl);
      try {
        await navigator.clipboard.writeText(t);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(f);
      setTimeout(() => setCopiedKey(null), 2000);
    },
    [shieldsUrl],
  );
  const handleDownloadSvg = useCallback(() => {
    if (!badge) return;
    downloadSvg(shieldsUrl, badge.name || badge.message);
  }, [badge, shieldsUrl]);
  const handleEdit = useCallback(() => {
    if (!badge) return;
    writeClipboard({
      label: badge.label,
      message: badge.message,
      color: badge.color,
      logo: badge.logo || undefined,
      logoColor: badge.logoColor || undefined,
      style: badge.style || 'flat',
      labelColor: badge.labelColor || undefined,
      categoryId: badge.categoryId,
    });
    window.location.href = base + 'forge';
  }, [badge, base]);
  const handleDelete = useCallback(async () => {
    if (!badge?.id) return;
    await deleteBadge(badge.id);
    setDeleted(true);
  }, [badge]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  if (notFound)
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold mb-2">Badge Not Found</h1>
        <p className="text-base-content/60 mb-6">This badge may have been deleted.</p>
        <a href={base + 'my-badges'} className="btn btn-primary">
          Go to My Badges
        </a>
      </div>
    );
  if (deleted)
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold mb-2">Badge Deleted</h1>
        <p className="text-base-content/60 mb-6">Removed permanently.</p>
        <a href={base + 'my-badges'} className="btn btn-primary">
          Go to My Badges
        </a>
      </div>
    );
  if (!badge) return null;

  return (
    <>
      <a
        href={base + 'my-badges'}
        className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Badges
      </a>

      <div className="card bg-base-100 border border-base-300/50 overflow-hidden">
        <div className="bg-base-200/50 px-6 py-14 flex items-center justify-center relative">
          {imgError ? (
            <span className="font-mono text-sm text-base-content/50">
              {badge.label}-{badge.message}-{badge.color}
            </span>
          ) : (
            <img
              src={shieldsUrl}
              alt={`${badge.label}: ${badge.message}`}
              className="transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              onError={() => setImgError(true)}
            />
          )}
          <div className="join join-horizontal absolute bottom-3 right-3 opacity-70 hover:opacity-100 transition-opacity">
            <button
              className={`join-item btn btn-xs gap-1 ${zoom === 1 ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setZoom(1)}
              title="Actual size"
            >
              <ZoomOut className="w-3 h-3" /> Actual
            </button>
            <button
              className={`join-item btn btn-xs gap-1 ${zoom === 2 ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setZoom(2)}
              title="Magnified (2x)"
            >
              <ZoomIn className="w-3 h-3" /> Magnified
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">
                {badge.name || `${badge.label}: ${badge.message}`}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-base-content/50">
                {badge.savedAt && <span>Saved {new Date(badge.savedAt).toLocaleDateString()}</span>}
                {category && (
                  <>
                    <span>·</span>
                    <span className="badge badge-xs badge-primary badge-outline">
                      {category.name}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                className="btn btn-sm btn-ghost text-error gap-1"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/60">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-sm border border-base-content/20"
                style={{ backgroundColor: `#${badge.color}` }}
              />
              <span className="font-mono text-xs">#{badge.color}</span>
            </span>
            {badge.logo && (
              <span className="badge badge-ghost badge-sm font-normal">{badge.logo}</span>
            )}
            <span className="badge badge-outline badge-sm">{badge.style || 'flat'}</span>
            {badge.labelColor && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-sm border border-base-content/20"
                  style={{ backgroundColor: `#${badge.labelColor}` }}
                />
                <span className="text-xs">label #{badge.labelColor}</span>
              </span>
            )}
          </div>
          <div className="border-t border-base-300/30 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Code2 className="w-4 h-4" /> Embed
              </h2>
              <div className="flex gap-1">
                <button className="btn btn-xs btn-ghost" onClick={() => setExpandCode(!expandCode)}>
                  {expandCode ? 'Show less' : 'All formats'}
                </button>
                <button className="btn btn-xs btn-ghost gap-1" onClick={handleDownloadSvg}>
                  <Download className="w-3 h-3" /> SVG
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(expandCode ? COPY_FORMATS : COPY_FORMATS.slice(0, 3)).map(({ key, label }) => (
                <button
                  key={key}
                  className={`btn btn-xs gap-1 ${copiedKey === key ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => copy(key)}
                >
                  {copiedKey === key ? (
                    <>
                      <Check className="w-3 h-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> {label}
                    </>
                  )}
                </button>
              ))}
            </div>
            {expandCode && (
              <div className="space-y-2 mt-3">
                {COPY_FORMATS.map(({ key, label }) => (
                  <div key={key} className="bg-base-200 rounded-btn p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-base-content/50">{label}</span>
                      <button
                        className={`btn btn-xs ${copiedKey === key ? 'btn-success' : 'btn-ghost'}`}
                        onClick={() => copy(key)}
                      >
                        {copiedKey === key ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-base-content/80 overflow-x-auto whitespace-pre-wrap break-all">
                      {getSnippet(key, shieldsUrl)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {deleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Delete Badge</h3>
            <p className="py-4">
              Delete &quot;{badge.name || `${badge.label}: ${badge.message}`}&quot;?
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-error" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
