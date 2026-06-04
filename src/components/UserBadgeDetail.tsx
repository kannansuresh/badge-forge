import { ArrowLeft, Check, Code2, Copy, Pencil, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  buildShieldsUrl,
  deleteBadge,
  getAllCategories,
  getBadgeById,
  toAsciiDoc,
  toHtml,
  toMarkdown,
  toRst,
  toTextile,
  writeClipboard,
  type SavedBadge,
  type UserCategory,
} from '../lib/storage';

type CopyFormat = 'md' | 'html' | 'url' | 'rst' | 'asciidoc' | 'textile';

const COPY_FORMATS: { key: CopyFormat; label: string }[] = [
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'url', label: 'URL' },
  { key: 'rst', label: 'reST' },
  { key: 'asciidoc', label: 'AsciiDoc' },
  { key: 'textile', label: 'Textile' },
];

export default function UserBadgeDetail() {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [badge, setBadge] = useState<SavedBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedKey, setCopiedKey] = useState<CopyFormat | null>(null);
  const [imgError, setImgError] = useState(false);
  const [expandCode, setExpandCode] = useState(false);
  const [category, setCategory] = useState<UserCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [zoom, setZoom] = useState<1 | 2>(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get('id');
    const id = rawId ? parseInt(rawId, 10) : NaN;
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
          const cat = cats.find((c) => c.id === b.categoryId);
          if (cat) setCategory(cat);
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

  const getSnippet = useCallback(
    (format: CopyFormat) => {
      switch (format) {
        case 'md':
          return toMarkdown(shieldsUrl);
        case 'html':
          return toHtml(shieldsUrl);
        case 'url':
          return shieldsUrl;
        case 'rst':
          return toRst(shieldsUrl);
        case 'asciidoc':
          return toAsciiDoc(shieldsUrl);
        case 'textile':
          return toTextile(shieldsUrl);
      }
    },
    [shieldsUrl],
  );

  const copy = useCallback(
    async (format: CopyFormat) => {
      const text = getSnippet(format);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(format);
      setTimeout(() => setCopiedKey(null), 2000);
    },
    [getSnippet],
  );

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
    window.location.href = `${base}forge`;
  }, [badge, base]);

  const handleDelete = useCallback(async () => {
    if (!badge?.id) return;
    await deleteBadge(badge.id);
    setDeleted(true);
  }, [badge]);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Badge Not Found</h1>
        <p className="text-base-content/60 mb-6">
          This badge may have been deleted or the ID is invalid.
        </p>
        <a href={`${base}dashboard`} className="btn btn-primary">
          Go to My Badges
        </a>
      </div>
    );
  }

  // Deleted
  if (deleted) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Badge Deleted</h1>
        <p className="text-base-content/60 mb-6">This badge has been permanently removed.</p>
        <a href={`${base}dashboard`} className="btn btn-primary">
          Go to My Badges
        </a>
      </div>
    );
  }

  if (!badge) return null;

  return (
    <>
      {/* Back link */}
      <a
        href={`${base}dashboard`}
        className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Badges
      </a>

      {/* Hero card */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body p-8 gap-6">
          {/* Badge preview */}
          <div>
            <div className="flex justify-center mb-4">
              <div className="bg-base-200/50 rounded-box p-8 w-full max-w-lg flex items-center justify-center min-h-24 overflow-hidden">
                {imgError ? (
                  <span className="font-mono text-sm text-base-content/50">
                    {badge.label}-{badge.message}-{badge.color}
                  </span>
                ) : (
                  <img
                    src={shieldsUrl}
                    alt={`${badge.label}: ${badge.message}`}
                    className="max-w-full transition-transform duration-200"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            </div>
            {/* Zoom toggle */}
            <div className="flex justify-center">
              <div className="join join-horizontal">
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
          </div>

          {/* Title + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {badge.name || `${badge.label}: ${badge.message}`}
              </h1>
              {badge.name && (
                <p className="text-base-content/60 text-sm mt-1">
                  {badge.label} · {badge.message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-base-content/50">
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
            <div className="flex gap-2">
              <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}>
                <Pencil className="w-3.5 h-3.5" /> Edit in Builder
              </button>
              <button
                className="btn btn-sm btn-ghost text-error gap-1"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-base-200 rounded-btn px-3 py-2">
              <span className="text-xs text-base-content/50 block">Style</span>
              <span className="text-sm font-medium">{badge.style || 'flat'}</span>
            </div>
            <div className="bg-base-200 rounded-btn px-3 py-2">
              <span className="text-xs text-base-content/50 block">Color</span>
              <span className="text-sm font-medium inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-base-content/20"
                  style={{ backgroundColor: `#${badge.color}` }}
                />
                #{badge.color}
              </span>
            </div>
            {badge.logo && (
              <div className="bg-base-200 rounded-btn px-3 py-2">
                <span className="text-xs text-base-content/50 block">Logo</span>
                <span className="text-sm font-medium">{badge.logo}</span>
              </div>
            )}
            {badge.logoColor && (
              <div className="bg-base-200 rounded-btn px-3 py-2">
                <span className="text-xs text-base-content/50 block">Logo Color</span>
                <span className="text-sm font-medium inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm border border-base-content/20"
                    style={{ backgroundColor: `#${badge.logoColor}` }}
                  />
                  #{badge.logoColor}
                </span>
              </div>
            )}
            {badge.labelColor && (
              <div className="bg-base-200 rounded-btn px-3 py-2">
                <span className="text-xs text-base-content/50 block">Label Color</span>
                <span className="text-sm font-medium inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm border border-base-content/20"
                    style={{ backgroundColor: `#${badge.labelColor}` }}
                  />
                  #{badge.labelColor}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embed code section */}
      <div className="card bg-base-100 shadow-sm border border-base-300 mt-6">
        <div className="card-body p-6 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Embed Code
            </h2>
            <button className="btn btn-xs btn-ghost" onClick={() => setExpandCode(!expandCode)}>
              {expandCode ? 'Show less' : 'Show all formats'}
            </button>
          </div>

          {/* Quick copy buttons */}
          <div className="flex flex-wrap gap-2">
            {(expandCode ? COPY_FORMATS : COPY_FORMATS.slice(0, 3)).map(({ key, label }) => (
              <button
                key={key}
                className={`btn btn-sm gap-1 ${copiedKey === key ? 'btn-success' : 'btn-outline'}`}
                onClick={() => copy(key)}
              >
                {copiedKey === key ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> {label}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Expanded code blocks */}
          {expandCode && (
            <div className="space-y-3">
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
                  <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    <code>{getSnippet(key)}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Delete Badge</h3>
            <p className="py-4">
              Are you sure you want to delete &quot;
              {badge.name || `${badge.label}: ${badge.message}`}&quot;? This action cannot be
              undone.
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
