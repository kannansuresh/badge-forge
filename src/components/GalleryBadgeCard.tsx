import { useState, useCallback, useMemo } from 'react';
import { buildShieldsUrl, toMarkdown, toHtml, writeClipboard } from '../lib/storage';

export interface GalleryBadgeConfig {
  id: string;
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor?: string;
}

interface GalleryBadgeCardProps {
  badge: GalleryBadgeConfig;
}

export default function GalleryBadgeCard({ badge }: GalleryBadgeCardProps) {
  const [copied, setCopied] = useState<'markdown' | 'html' | 'url' | null>(null);
  const [imgError, setImgError] = useState(false);

  const shieldsUrl = useMemo(
    () =>
      buildShieldsUrl({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo,
        logoColor: badge.logoColor,
        style: badge.style,
        labelColor: badge.labelColor,
      }),
    [badge],
  );

  /** Write badge to sessionStorage then navigate to the builder */
  const handleEdit = useCallback(() => {
    writeClipboard({
      label: badge.label,
      message: badge.message,
      color: badge.color,
      logo: badge.logo,
      logoColor: badge.logoColor,
      style: badge.style,
      labelColor: badge.labelColor,
    });
    window.location.href = '/builder';
  }, [badge]);

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

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300 card-hover group">
      <div className="card-body p-4 gap-2 items-center text-center">
        {/* Badge preview */}
        <div className="badge-preview-wrapper w-full min-h-[52px]">
          {imgError ? (
            <span className="text-xs font-mono text-base-content/50">
              {badge.label}-{badge.message}-{badge.color}
            </span>
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

        {/* Label */}
        <div className="text-sm font-medium text-base-content/70">
          {badge.label} · {badge.message}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1 justify-center">
          <span className="badge badge-xs badge-outline">{badge.style || 'flat'}</span>
          {badge.logo && <span className="badge badge-xs badge-ghost">{badge.logo}</span>}
        </div>

        {/* ── Copy + Edit actions ─────────────────── */}
        <div className="flex flex-wrap gap-1 justify-center mt-1">
          {/* Copy Markdown */}
          <button
            className={`btn btn-xs ${copied === 'markdown' ? 'btn-success' : 'btn-ghost'}`}
            onClick={(e) => {
              e.preventDefault();
              copy('markdown');
            }}
            title="Copy Markdown"
          >
            {copied === 'markdown' ? '✓ MD' : 'MD'}
          </button>

          {/* Copy HTML */}
          <button
            className={`btn btn-xs ${copied === 'html' ? 'btn-success' : 'btn-ghost'}`}
            onClick={(e) => {
              e.preventDefault();
              copy('html');
            }}
            title="Copy HTML"
          >
            {copied === 'html' ? '✓ HTML' : 'HTML'}
          </button>

          {/* Copy URL */}
          <button
            className={`btn btn-xs ${copied === 'url' ? 'btn-success' : 'btn-ghost'}`}
            onClick={(e) => {
              e.preventDefault();
              copy('url');
            }}
            title="Copy shields.io URL"
          >
            {copied === 'url' ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <span className="w-px h-5 bg-base-300 self-center mx-0.5" />

          {/* Edit in Studio — via sessionStorage clipboard */}
          <button
            className="btn btn-xs btn-primary btn-outline gap-1"
            onClick={handleEdit}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
