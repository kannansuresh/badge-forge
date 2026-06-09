import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { getBadgeById, deleteBadge, getAllCategories, writeClipboard, type SavedBadge } from '../lib/storage';
import BadgeDetailView from './BadgeDetailView';

export default function UserBadgeDetail() {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const [id, setId] = useState<number | null>(null);
  const [badge, setBadge] = useState<SavedBadge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleted, setDeleted] = useState<boolean>(false);

  // Read id from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const parsedId = parseInt(params.get('id') || '', 10);
    if (!isNaN(parsedId) && parsedId > 0) {
      setId(parsedId);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch badge details
  useEffect(() => {
    if (id === null) return;

    let active = true;
    async function loadData() {
      try {
        const data = await getBadgeById(id);
        if (!active) return;
        setBadge(data || null);

        if (data?.categoryId) {
          const cats = await getAllCategories();
          const match = cats.find((c) => c.id === data.categoryId);
          if (match && active) {
            setCategoryName(match.name);
          }
        }
      } catch (err) {
        console.error('Failed to load user badge:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [id]);

  const handleEdit = useCallback(() => {
    if (!badge) return;
    writeClipboard({
      label: badge.label,
      message: badge.message,
      color: badge.color,
      logo: badge.logo || undefined,
      logoColor: badge.logoColor || undefined,
      logoSize: badge.logoSize || undefined,
      style: badge.style || 'flat',
      labelColor: badge.labelColor || undefined,
      categoryId: badge.categoryId,
    });
    window.location.href = `${base}forge`;
  }, [badge, base]);

  const handleDelete = useCallback(async () => {
    if (id === null) return;
    try {
      await deleteBadge(id);
      setDeleted(true);
      setDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete badge:', err);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="text-center py-20">
        <h1 class="text-xl font-bold mb-2">Badge Deleted</h1>
        <p class="text-base-content/60 mb-6">Removed permanently.</p>
        <a href={`${base}my-badges`} class="btn btn-primary">
          Go to My Badges
        </a>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="text-center py-20">
        <h1 class="text-xl font-bold mb-2">Badge Not Found</h1>
        <p class="text-base-content/60 mb-6">This badge may have been deleted.</p>
        <a href={`${base}my-badges`} class="btn btn-primary">
          Go to My Badges
        </a>
      </div>
    );
  }

  return (
    <>
      <BadgeDetailView
        label={badge.label}
        message={badge.message}
        color={badge.color}
        logo={badge.logo}
        logoColor={badge.logoColor}
        logoSize={badge.logoSize}
        style={badge.style}
        labelColor={badge.labelColor}
        header={
          <a
            href={`${base}my-badges`}
            className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Badges
          </a>
        }
        subtitle={
          <p className="text-sm text-base-content/50 mt-1">
            {badge.savedAt ? `Saved ${new Date(badge.savedAt).toLocaleDateString()}` : 'Saved badge'}
            {categoryName && (
              <>
                {' '}
                ·{' '}
                <span className="badge badge-xs badge-primary badge-outline">{categoryName}</span>
              </>
            )}
          </p>
        }
        actions={
          <>
            <button className="btn btn-sm btn-outline gap-1" onClick={handleEdit}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              className="btn btn-sm btn-ghost text-error gap-1"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </>
        }
      />

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Delete Badge</h3>
            <p className="py-4">
              Delete &quot;{badge.name || `${badge.label}: ${badge.message}`}&quot;?
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-error" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
            <button className="hidden">close</button>
          </div>
        </div>
      )}
    </>
  );
}
