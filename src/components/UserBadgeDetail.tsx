import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { deleteBadge, getAllCategories, getBadgeById, writeClipboard, type SavedBadge, type UserCategory } from '../lib/storage';
import BadgeDetailView from './BadgeDetailView';

export default function UserBadgeDetail() {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [badge, setBadge] = useState<SavedBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [category, setCategory] = useState<UserCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id') || '', 10);
    if (isNaN(id) || id <= 0) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const b = await getBadgeById(id);
        if (!b) { setNotFound(true); return; }
        setBadge(b);
        if (b.categoryId) {
          const cats = await getAllCategories();
          setCategory(cats.find((c) => c.id === b.categoryId) ?? null);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const handleEdit = useCallback(() => {
    if (!badge) return;
    writeClipboard({ label: badge.label, message: badge.message, color: badge.color, logo: badge.logo || undefined, logoColor: badge.logoColor || undefined, style: badge.style || 'flat', labelColor: badge.labelColor || undefined, categoryId: badge.categoryId });
    window.location.href = base + 'forge';
  }, [badge, base]);

  const handleDelete = useCallback(async () => {
    if (!badge?.id) return;
    await deleteBadge(badge.id);
    setDeleted(true);
  }, [badge]);

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;
  if (notFound) return <div className="text-center py-20"><h1 className="text-xl font-bold mb-2">Badge Not Found</h1><p className="text-base-content/60 mb-6">This badge may have been deleted or the ID is invalid.</p><a href={base + 'my-badges'} className="btn btn-primary">Go to My Badges</a></div>;
  if (deleted) return <div className="text-center py-20"><h1 className="text-xl font-bold mb-2">Badge Deleted</h1><p className="text-base-content/60 mb-6">This badge has been permanently removed.</p><a href={base + 'my-badges'} className="btn btn-primary">Go to My Badges</a></div>;
  if (!badge) return null;

  return (
    <>
      <BadgeDetailView
        badge={badge}
        header={<a href={base + 'my-badges'} className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"><ArrowLeft className="w-4 h-4" /> Back to My Badges</a>}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-base-content/50">
            {badge.savedAt && <span>Saved {new Date(badge.savedAt).toLocaleDateString()}</span>}
            {category && <><span>·</span><span className="badge badge-xs badge-primary badge-outline">{category.name}</span></>}
          </div>
        }
        actions={<>
          <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button className="btn btn-sm btn-ghost text-error gap-1" onClick={() => setDeleteConfirm(true)}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </>}
      />
      {deleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Delete Badge</h3>
            <p className="py-4">Are you sure you want to delete &quot;{badge.name || `${badge.label}: ${badge.message}`}&quot;? This action cannot be undone.</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-error" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
