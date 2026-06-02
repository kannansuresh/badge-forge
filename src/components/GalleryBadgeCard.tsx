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

export default function GalleryBadgeCard({ badge }: { badge: GalleryBadgeConfig }) {
  const [copied, setCopied] = useState<'md' | 'html' | 'url' | null>(null);
  const [imgError, setImgError] = useState(false);

  const shieldsUrl = useMemo(
    () => buildShieldsUrl({ ...badge, logo: badge.logo, logoColor: badge.logoColor, style: badge.style, labelColor: badge.labelColor }),
    [badge],
  );

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
    async (type: 'md' | 'html' | 'url') => {
      let text = '';
      if (type === 'md') text = toMarkdown(shieldsUrl);
      else if (type === 'html') text = toHtml(shieldsUrl);
      else text = shieldsUrl;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
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
    <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md transition-shadow group">
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
        <h3 className="card-title text-sm">
          {badge.label} <span className="text-base-content/40 font-normal">·</span> {badge.message}
        </h3>

        <div className="flex flex-wrap gap-1">
          <span className="badge badge-xs badge-outline">{badge.style || 'flat'}</span>
          {badge.logo && <span className="badge badge-xs badge-ghost">{badge.logo}</span>}
        </div>

        <div className="card-actions justify-end mt-1">
          <div className="join join-horizontal">
            <button
              className={`join-item btn btn-xs ${copied === 'md' ? 'btn-success' : 'btn-ghost'}`}
              onClick={(e) => { e.preventDefault(); copy('md'); }}
              title="Copy Markdown"
            >
              {copied === 'md' ? '✓' : 'MD'}
            </button>
            <button
              className={`join-item btn btn-xs ${copied === 'html' ? 'btn-success' : 'btn-ghost'}`}
              onClick={(e) => { e.preventDefault(); copy('html'); }}
              title="Copy HTML"
            >
              {copied === 'html' ? '✓' : 'HTML'}
            </button>
            <button
              className={`join-item btn btn-xs ${copied === 'url' ? 'btn-success' : 'btn-ghost'}`}
              onClick={(e) => { e.preventDefault(); copy('url'); }}
              title="Copy URL"
            >
              {copied === 'url' ? '✓' : 'URL'}
            </button>
          </div>
          <button className="btn btn-xs btn-primary btn-outline" onClick={handleEdit}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
