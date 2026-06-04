import { ArrowLeft, Bookmark, Check, Code2, Copy, Pencil, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  buildShieldsUrl,
  getAllCategories,
  isDuplicate,
  saveBadge,
  seedDefaultCategories,
  toAsciiDoc,
  toHtml,
  toMarkdown,
  toRst,
  toTextile,
  writeClipboard,
} from '../lib/storage';

interface GalleryBadgeDetailProps {
  badge: {
    id: string;
    label: string;
    message: string;
    color: string;
    logo: string | null;
    logoColor: string | null;
    style: string;
    labelColor: string | null;
  };
  category: {
    name: string;
    /** File-path-based slug for URL routing (e.g., "backup/ai-bots"). */
    slug: string;
    /** JSON categorySlug for Dexie category lookup (e.g., "ai-bots"). */
    dexieSlug?: string;
    description: string | null;
  };
}

type CopyFormat = 'md' | 'html' | 'url' | 'rst' | 'asciidoc' | 'textile';

const COPY_FORMATS: { key: CopyFormat; label: string }[] = [
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'url', label: 'URL' },
  { key: 'rst', label: 'reST' },
  { key: 'asciidoc', label: 'AsciiDoc' },
  { key: 'textile', label: 'Textile' },
];

export default function GalleryBadgeDetail({ badge, category }: GalleryBadgeDetailProps) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [copiedKey, setCopiedKey] = useState<CopyFormat | null>(null);
  const [imgError, setImgError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [expandCode, setExpandCode] = useState(false);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [zoom, setZoom] = useState<1 | 2>(1);

  const style = (badge.style || 'flat') as
    | 'flat'
    | 'flat-square'
    | 'plastic'
    | 'for-the-badge'
    | 'social';

  const shieldsUrl = buildShieldsUrl({
    label: badge.label,
    message: badge.message,
    color: badge.color,
    logo: badge.logo ?? undefined,
    logoColor: badge.logoColor ?? undefined,
    style,
    labelColor: badge.labelColor ?? undefined,
  });

  // Load categories and find matching one (use dexieSlug for lookup)
  const lookupSlug = category.dexieSlug || category.slug;
  useEffect(() => {
    (async () => {
      await seedDefaultCategories();
      const cats = await getAllCategories();
      const match = cats.find((c) => c.slug === lookupSlug);
      if (match?.id) setCategoryId(match.id);
    })();
  }, [lookupSlug]);

  // Check if already saved
  useEffect(() => {
    (async () => {
      const dup = await isDuplicate({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo ?? '',
        logoColor: badge.logoColor ?? '',
        style,
        labelColor: badge.labelColor ?? '',
        categoryId,
      });
      setAlreadySaved(dup);
    })();
  }, [badge, style, categoryId]);

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

  const handleSave = useCallback(async () => {
    try {
      await saveBadge({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo ?? '',
        logoColor: badge.logoColor ?? '',
        style,
        labelColor: badge.labelColor ?? '',
        categoryId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Already saved
      setAlreadySaved(true);
    }
  }, [badge, style, categoryId]);

  const handleEdit = useCallback(() => {
    writeClipboard({
      label: badge.label,
      message: badge.message,
      color: badge.color,
      logo: badge.logo ?? undefined,
      logoColor: badge.logoColor ?? undefined,
      style,
      labelColor: badge.labelColor ?? undefined,
      categorySlug: category.slug,
      categoryId,
    });
    window.location.href = `${base}forge`;
  }, [badge, style, category, categoryId]);

  return (
    <>
      {/* Back link */}
      <a
        href={`${base}gallery/${category.slug}`}
        className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {category.name}
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
                {badge.label}
                <span className="text-base-content/40 mx-2">·</span>
                {badge.message}
              </h1>
              <p className="text-base-content/60 text-sm mt-1">
                From{' '}
                <a href={`${base}gallery/${category.slug}`} className="link link-hover">
                  {category.name}
                </a>
                gallery
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm gap-1 ${saved ? 'btn-success' : alreadySaved ? 'btn-ghost btn-disabled' : 'btn-primary'}`}
                onClick={handleSave}
                disabled={alreadySaved || saved}
              >
                {saved ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Saved
                  </>
                ) : alreadySaved ? (
                  <>
                    <Bookmark className="w-3.5 h-3.5" /> Already Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" /> Save to My Badges
                  </>
                )}
              </button>
              <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}>
                <Pencil className="w-3.5 h-3.5" /> Edit in Builder
              </button>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-base-200 rounded-btn px-3 py-2">
              <span className="text-xs text-base-content/50 block">Style</span>
              <span className="text-sm font-medium">{style}</span>
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

          {/* Quick copy buttons (always visible) */}
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
    </>
  );
}
