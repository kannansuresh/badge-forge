import { ArrowLeft, Bookmark, Check, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  getAllCategories,
  isDuplicate,
  saveBadge,
  seedDefaultCategories,
  writeClipboard,
} from '../lib/storage';
import BadgeDetailView from './BadgeDetailView';

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
  category: { name: string; slug: string; dexieSlug?: string; description: string | null };
}

export default function GalleryBadgeDetail({ badge, category }: GalleryBadgeDetailProps) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [saved, setSaved] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  const style = (badge.style || 'flat') as
    | 'flat'
    | 'flat-square'
    | 'plastic'
    | 'for-the-badge'
    | 'social';

  const lookupSlug = category.dexieSlug || category.slug;
  useEffect(() => {
    (async () => {
      await seedDefaultCategories();
      const cats = await getAllCategories();
      const match = cats.find((c) => c.slug === lookupSlug);
      if (match?.id) setCategoryId(match.id);
    })();
  }, [lookupSlug]);

  useEffect(() => {
    (async () => {
      const dup = await isDuplicate({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo ?? '',
        logoColor: badge.logoColor ?? '',
        logoSize: '',
        style,
        labelColor: badge.labelColor ?? '',
        categoryId,
      });
      setAlreadySaved(dup);
    })();
  }, [badge, style, categoryId]);

  const handleSave = useCallback(async () => {
    try {
      await saveBadge({
        label: badge.label,
        message: badge.message,
        color: badge.color,
        logo: badge.logo ?? '',
        logoColor: badge.logoColor ?? '',
        logoSize: '',
        style,
        labelColor: badge.labelColor ?? '',
        categoryId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
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
    <BadgeDetailView
      badge={badge}
      header={
        <a
          href={`${base}gallery/${category.slug}`}
          className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {category.name}
        </a>
      }
      subtitle={
        <p className="text-sm text-base-content/50 mt-1">
          From{' '}
          <a href={`${base}gallery/${category.slug}`} className="link link-hover">
            {category.name}
          </a>{' '}
          gallery
        </p>
      }
      actions={
        <>
          <button
            className={`btn btn-sm gap-1 ${saved ? 'btn-success' : alreadySaved ? 'btn-disabled' : 'btn-primary'}`}
            onClick={handleSave}
            disabled={alreadySaved || saved}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" /> Saved
              </>
            ) : alreadySaved ? (
              <>
                <Bookmark className="w-3.5 h-3.5" /> Already saved
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" /> Save
              </>
            )}
          </button>
          <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </>
      }
    />
  );
}
