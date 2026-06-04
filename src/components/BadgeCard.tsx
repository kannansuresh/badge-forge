import { ExternalLink, Pencil } from 'lucide-react';
import { useCallback, useState } from 'react';
import { buildShieldsUrl, toHtml, toMarkdown } from '../lib/storage';

export interface BadgeConfig {
  id?: string | number | undefined;
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor?: string;
  name?: string;
  savedAt?: string;
  categoryId?: number | undefined;
  categoryName?: string | undefined;
}

interface BadgeCardProps {
  badge: BadgeConfig;
  onEdit?: (badge: BadgeConfig) => void;
  onDelete?: (badge: BadgeConfig) => void;
  onSave?: (badge: BadgeConfig) => void;
  showActions?: boolean;
}

export default function BadgeCard({
  badge,
  onEdit,
  onDelete,
  onSave,
  showActions = true,
}: BadgeCardProps) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [copied, setCopied] = useState<'md' | 'html' | 'url' | null>(null);
  const [imgError, setImgError] = useState(false);

  const detailUrl = typeof badge.id === 'number' ? `${base}badge?id=${badge.id}` : null;
  const shieldsUrl = buildShieldsUrl({
    label: badge.label,
    message: badge.message,
    color: badge.color,
    logo: badge.logo,
    logoColor: badge.logoColor,
    style: badge.style || 'flat',
    labelColor: badge.labelColor,
  });

  const copy = useCallback(
    async (type: 'md' | 'html' | 'url') => {
      const text =
        type === 'md' ? toMarkdown(shieldsUrl) : type === 'html' ? toHtml(shieldsUrl) : shieldsUrl;
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
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    },
    [shieldsUrl],
  );

  return (
    <div className="card bg-base-100 border border-base-300/50 card-lift group overflow-hidden">
      {/* Badge preview — matching GalleryBadgeCard */}
      {detailUrl ? (
        <a href={detailUrl} className="bg-base-200/50 px-5 py-6 flex items-center justify-center">
          {imgError ? (
            <span className="font-mono text-xs text-base-content/50">
              {badge.label}-{badge.message}-{badge.color}
            </span>
          ) : (
            <img
              src={shieldsUrl}
              alt={`${badge.label}: ${badge.message}`}
              className="h-7 group-hover:scale-105 transition-transform"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </a>
      ) : (
        <div className="bg-base-200/50 px-5 py-6 flex items-center justify-center">
          {imgError ? (
            <span className="font-mono text-xs text-base-content/50">
              {badge.label}-{badge.message}-{badge.color}
            </span>
          ) : (
            <img
              src={shieldsUrl}
              alt={`${badge.label}: ${badge.message}`}
              className="h-7 group-hover:scale-105 transition-transform"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-semibold truncate">
          {detailUrl ? (
            <a href={detailUrl} className="group-hover:text-primary transition-colors">
              {badge.name || badge.message}
            </a>
          ) : (
            <span>{badge.name || badge.message}</span>
          )}
        </h3>

        {/* Meta row: color swatch + logo + category */}
        <div className="flex items-center gap-2 text-xs text-base-content/50 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: `#${badge.color}` }}
            />
            <span className="font-mono text-xs">#{badge.color}</span>
          </span>
          {badge.logo && (
            <span className="badge badge-ghost badge-xs font-normal">{badge.logo}</span>
          )}
          {badge.categoryName && (
            <span className="badge badge-xs badge-primary badge-outline">{badge.categoryName}</span>
          )}
        </div>

        {badge.savedAt && (
          <p className="text-xs text-base-content/50">
            {new Date(badge.savedAt).toLocaleDateString()}
          </p>
        )}

        {/* Actions — matching GalleryBadgeCard */}
        {showActions && (
          <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-base-300/30 flex-wrap">
            {detailUrl && (
              <a href={detailUrl} className="btn btn-xs btn-ghost gap-1" title="View details">
                <ExternalLink className="w-3 h-3" /> Details
              </a>
            )}
            <div className="join join-horizontal">
              <button
                className={`join-item btn btn-xs px-2 ${copied === 'md' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => copy('md')}
                title="Copy Markdown"
              >
                {copied === 'md' ? '✓' : 'MD'}
              </button>
              <button
                className={`join-item btn btn-xs px-2 ${copied === 'html' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => copy('html')}
                title="Copy HTML"
              >
                {copied === 'html' ? '✓' : 'HTML'}
              </button>
              <button
                className={`join-item btn btn-xs px-2 ${copied === 'url' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => copy('url')}
                title="Copy URL"
              >
                {copied === 'url' ? '✓' : 'URL'}
              </button>
            </div>
            {onEdit && (
              <button className="btn btn-xs btn-primary" onClick={() => onEdit(badge)}>
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            {onSave && (
              <button className="btn btn-xs btn-primary" onClick={() => onSave(badge)}>
                Save
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-xs btn-ghost text-error"
                onClick={() => onDelete(badge)}
                title="Delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
