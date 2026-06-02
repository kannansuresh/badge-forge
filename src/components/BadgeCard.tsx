import { useState, useCallback } from 'react';
import { buildShieldsUrl, toMarkdown, toHtml } from '../lib/storage';

export interface BadgeConfig {
  id?: string;
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
  linkToBuilder?: boolean;
}

export default function BadgeCard({
  badge,
  onEdit,
  onDelete,
  onSave,
  showActions = true,
  linkToBuilder = false,
}: BadgeCardProps) {
  const [copied, setCopied] = useState<'markdown' | 'html' | 'url' | null>(null);
  const [imgError, setImgError] = useState(false);

  const style = badge.style || 'flat';
  const shieldsUrl = buildShieldsUrl({
    label: badge.label,
    message: badge.message,
    color: badge.color,
    logo: badge.logo,
    logoColor: badge.logoColor,
    style,
    labelColor: badge.labelColor,
  });

  const copy = useCallback(
    async (type: 'markdown' | 'html' | 'url') => {
      let text = '';
      if (type === 'markdown') text = toMarkdown(shieldsUrl);
      else if (type === 'html') text = toHtml(shieldsUrl);
      else text = shieldsUrl;

      try {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      }
    },
    [shieldsUrl],
  );

  const handleBuilderClick = useCallback(() => {
    if (linkToBuilder && onEdit) {
      onEdit(badge);
    }
  }, [linkToBuilder, onEdit, badge]);

  return (
    <div className="card bg-base-100 shadow-md border border-base-300 card-hover">
      <div className="card-body p-5 gap-3">
        {/* Badge name / title */}
        {badge.name && (
          <h3 className="card-title text-sm font-semibold text-base-content/80">
            {badge.name}
          </h3>
        )}

        {/* Badge preview */}
        <div
          className={`badge-preview-wrapper min-h-[60px] ${linkToBuilder ? 'cursor-pointer' : ''}`}
          onClick={handleBuilderClick}
          role={linkToBuilder ? 'button' : undefined}
          tabIndex={linkToBuilder ? 0 : undefined}
          onKeyDown={linkToBuilder ? (e) => { if (e.key === 'Enter') handleBuilderClick(); } : undefined}
        >
          {imgError ? (
            <div className="flex items-center gap-2 text-base-content/60">
              <span className="text-sm font-mono bg-base-300 px-2 py-1 rounded">
                {badge.label}-{badge.message}-{badge.color}
              </span>
            </div>
          ) : (
            <img
              src={shieldsUrl}
              alt={`${badge.label}: ${badge.message}`}
              className="max-w-full h-auto"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {/* Badge details chip row */}
        <div className="flex flex-wrap gap-1.5">
          <span className="badge badge-sm badge-outline">{style}</span>
          <span className="badge badge-sm" style={{ backgroundColor: `#${badge.color}`, color: '#fff' }}>
            #{badge.color}
          </span>
          {badge.logo && (
            <span className="badge badge-sm badge-ghost">{badge.logo}</span>
          )}
        </div>

        {/* Timestamp */}
        {badge.savedAt && (
          <p className="text-xs text-base-content/50">
            Saved {new Date(badge.savedAt).toLocaleString()}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="card-actions justify-end mt-1 flex-wrap gap-1">
            {/* Copy URL */}
            <button
              className={`copy-btn ${copied === 'url' ? 'text-success' : ''}`}
              onClick={() => copy('url')}
              title="Copy shields.io URL"
            >
              {copied === 'url' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>

            {/* Copy Markdown */}
            <button
              className={`copy-btn ${copied === 'markdown' ? 'text-success' : ''}`}
              onClick={() => copy('markdown')}
              title="Copy Markdown"
            >
              {copied === 'markdown' ? '✓ Copied!' : 'MD'}
            </button>

            {/* Copy HTML */}
            <button
              className={`copy-btn ${copied === 'html' ? 'text-success' : ''}`}
              onClick={() => copy('html')}
              title="Copy HTML"
            >
              {copied === 'html' ? '✓ Copied!' : 'HTML'}
            </button>

            {/* Edit */}
            {onEdit && (
              <button className="btn btn-sm btn-ghost" onClick={() => onEdit(badge)} title="Edit badge">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Save */}
            {onSave && (
              <button className="btn btn-sm btn-primary" onClick={() => onSave(badge)} title="Save to collection">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
            )}

            {/* Delete */}
            {onDelete && (
              <button className="btn btn-sm btn-ghost text-error" onClick={() => onDelete(badge)} title="Delete badge">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
