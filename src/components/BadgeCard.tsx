import { useState, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { buildShieldsUrl, toMarkdown, toHtml } from '../lib/storage';

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
  const [copied, setCopied] = useState<'md' | 'html' | 'url' | null>(null);
  const [imgError, setImgError] = useState(false);

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
    <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
      <figure className="px-4 pt-4">
        {imgError ? (
          <span className="font-mono text-xs text-base-content/50">
            {badge.label}-{badge.message}-{badge.color}
          </span>
        ) : (
          <img
            src={shieldsUrl}
            alt={`${badge.label}: ${badge.message}`}
            className="h-6"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </figure>

      <div className="card-body p-4 gap-2">
        {badge.name && <h3 className="card-title text-sm">{badge.name}</h3>}

        <div className="flex flex-wrap gap-1">
          <span className="badge badge-xs badge-outline">{badge.style || 'flat'}</span>
          <span
            className="badge badge-xs"
            style={{ backgroundColor: `#${badge.color}`, color: '#fff' }}
          >
            #{badge.color}
          </span>
          {badge.logo && <span className="badge badge-xs badge-ghost">{badge.logo}</span>}
        </div>

        {badge.savedAt && (
          <p className="text-xs text-base-content/50">{new Date(badge.savedAt).toLocaleString()}</p>
        )}

        {showActions && (
          <div className="card-actions justify-end mt-1 flex-wrap gap-1">
            <div className="join join-horizontal">
              <button
                className={`join-item btn btn-xs ${copied === 'md' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => copy('md')}
                title="Copy Markdown"
              >
                {copied === 'md' ? '✓' : 'MD'}
              </button>
              <button
                className={`join-item btn btn-xs ${copied === 'html' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => copy('html')}
                title="Copy HTML"
              >
                {copied === 'html' ? '✓' : 'HTML'}
              </button>
              <button
                className={`join-item btn btn-xs ${copied === 'url' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => copy('url')}
                title="Copy URL"
              >
                {copied === 'url' ? '✓' : 'URL'}
              </button>
            </div>
            {onEdit && (
              <button
                className="btn btn-xs btn-primary btn-outline gap-1"
                onClick={() => onEdit(badge)}
              >
                <Pencil className="w-3 h-3" />
                Edit
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
