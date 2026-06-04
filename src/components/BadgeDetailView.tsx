import { Check, Code2, Copy, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useState } from 'react';
import { buildShieldsUrl, toAsciiDoc, toHtml, toMarkdown, toRst, toTextile } from '../lib/storage';

export type CopyFormat = 'md' | 'html' | 'url' | 'rst' | 'asciidoc' | 'textile';

const COPY_FORMATS: { key: CopyFormat; label: string }[] = [
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'url', label: 'URL' },
  { key: 'rst', label: 'reST' },
  { key: 'asciidoc', label: 'AsciiDoc' },
  { key: 'textile', label: 'Textile' },
];

export interface BadgeDetailData {
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
  style?: string;
  labelColor?: string;
}

interface BadgeDetailViewProps {
  badge: BadgeDetailData;
  /** Content above the card (back link, etc.) */
  header?: React.ReactNode;
  /** Actions next to the title (Save, Edit, Delete buttons) */
  actions?: React.ReactNode;
  /** Subtitle below the title (category, date, etc.) */
  subtitle?: React.ReactNode;
}

export default function BadgeDetailView({
  badge,
  header,
  actions,
  subtitle,
}: BadgeDetailViewProps) {
  const [copiedKey, setCopiedKey] = useState<CopyFormat | null>(null);
  const [imgError, setImgError] = useState(false);
  const [expandCode, setExpandCode] = useState(false);
  const [zoom, setZoom] = useState<1 | 2>(1);

  const style = badge.style || 'flat';
  const shieldsUrl = buildShieldsUrl({
    label: badge.label,
    message: badge.message,
    color: badge.color,
    logo: badge.logo || undefined,
    logoColor: badge.logoColor || undefined,
    logoSize: badge.logoSize || undefined,
    style,
    labelColor: badge.labelColor || undefined,
  });

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

  return (
    <>
      {header}

      {/* Unified detail card */}
      <div className="card bg-base-100 border border-base-300/50 card-lift overflow-hidden">
        {/* Badge preview hero */}
        <div className="bg-base-200/50 px-6 py-10 flex flex-col items-center justify-center gap-4">
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

        {/* Card body */}
        <div className="p-6 space-y-5">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">
                {badge.label ? `${badge.label}: ${badge.message}` : badge.message}
              </h1>
              {subtitle}
            </div>
            {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
          </div>

          {/* Metadata row */}
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
            <span className="badge badge-outline badge-sm">{style}</span>
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

          {/* Embed code */}
          <div className="border-t border-base-300/30 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Code2 className="w-4 h-4" /> Embed
              </h2>
              <button className="btn btn-xs btn-ghost" onClick={() => setExpandCode(!expandCode)}>
                {expandCode ? 'Show less' : 'All formats'}
              </button>
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
                      {getSnippet(key)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
