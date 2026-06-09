import { Pencil, Trash2, Copy } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { copyToClipboard } from '../lib/dom';
import { COPY_FORMATS, getSnippet, type CopyFormatKey } from '../lib/formats';
import { buildShieldsUrl } from '../lib/storage';

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
  categoryId?: number | string | undefined;
  categoryName?: string | undefined;
  categorySlug?: string | undefined;
}

interface BadgeCardProps {
  badge: BadgeConfig;
  onEdit?: (badge: BadgeConfig) => void;
  onDelete?: (badge: BadgeConfig) => void;
  onSave?: (badge: BadgeConfig) => void;
  showActions?: boolean;
}

/** Shared badge preview image with error fallback. */
function BadgePreviewImage({
  imgError,
  badge,
  shieldsUrl,
  onError,
}: {
  imgError: boolean;
  badge: BadgeConfig;
  shieldsUrl: string;
  onError: () => void;
}) {
  if (imgError) {
    return (
      <span className="font-mono text-xs text-base-content/50">
        {badge.label}-{badge.message}-{badge.color}
      </span>
    );
  }
  return (
    <img
      src={shieldsUrl}
      alt={`${badge.label}: ${badge.message}`}
      className="h-7 group-hover:scale-105 transition-transform"
      loading="lazy"
      onError={onError}
    />
  );
}

export default function BadgeCard({
  badge,
  onEdit,
  onDelete,
  onSave,
  showActions = true,
}: BadgeCardProps) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [copied, setCopied] = useState<CopyFormatKey | null>(null);
  const [imgError, setImgError] = useState(false);

  const detailUrl =
    typeof badge.id === 'number'
      ? `${base}badge?id=${badge.id}`
      : typeof badge.id === 'string'
        ? `${base}gallery/${badge.categorySlug || badge.categoryId}/${badge.id}`
        : null;
  const shieldsUrl = buildShieldsUrl({
    label: badge.label,
    message: badge.message,
    color: badge.color,
    logo: badge.logo,
    logoColor: badge.logoColor,
    style: badge.style || 'flat',
    labelColor: badge.labelColor,
  });

  const quickSnippets = useMemo(() => {
    const map = {} as Record<CopyFormatKey, string>;
    for (const { key } of COPY_FORMATS) {
      map[key] = getSnippet(key, shieldsUrl);
    }
    return map;
  }, [shieldsUrl]);

  const copy = useCallback(
    async (type: CopyFormatKey) => {
      await copyToClipboard(quickSnippets[type]);
      setCopied(type);
      setTimeout(() => setCopied(null), 1200);
    },
    [quickSnippets],
  );

  return (
    <div className="card glass-card card-lift group overflow-hidden">
      {/* Floating action buttons — appear on hover */}
      {showActions && (
        <div className="absolute top-2 right-2 z-10 opacity-40 hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <div className="tooltip tooltip-left [&::before]:text-[10px]" data-tip="Edit in Forge">
              <button
                className="btn btn-xs btn-ghost hover:bg-base-100/80"
                onClick={() => onEdit(badge)}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          {onDelete && (
            <div
              className="tooltip tooltip-left [&::before]:text-[10px]"
              data-tip="Delete from My Badges"
            >
              <button
                className="btn btn-xs btn-ghost hover:bg-base-100/80 text-error"
                onClick={() => onDelete(badge)}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Badge preview — matching GalleryBadgeCard */}
      {detailUrl ? (
        <a href={detailUrl} className="bg-base-200/50 px-5 py-6 flex items-center justify-center">
          <BadgePreviewImage
            imgError={imgError}
            badge={badge}
            shieldsUrl={shieldsUrl}
            onError={() => setImgError(true)}
          />
        </a>
      ) : (
        <div className="bg-base-200/50 px-5 py-6 flex items-center justify-center">
          <BadgePreviewImage
            imgError={imgError}
            badge={badge}
            shieldsUrl={shieldsUrl}
            onError={() => setImgError(true)}
          />
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
          <div className="card-actions justify-center mt-2 pt-2 border-t border-base-300/30">
            <div className="join join-horizontal">
              <span
                className="join-item btn btn-xs btn-ghost px-1 pointer-events-none opacity-50"
                title="Copy format"
              >
                <Copy className="w-3 h-3" />
              </span>
              {COPY_FORMATS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`join-item btn btn-xs px-2 ${copied === key ? 'btn-success' : 'btn-ghost'}`}
                  onClick={() => copy(key)}
                  title={`Copy as ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {onSave && (
              <button className="btn btn-xs btn-primary" onClick={() => onSave(badge)}>
                Save
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
