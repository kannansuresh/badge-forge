import { useCallback, useEffect, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  deleteCategoryAndBadges,
  getAllBadges,
  getAllCategories,
  getCategoryById,
  updateCategory,
  type SavedBadge,
  type UserCategory,
} from '../lib/storage';

// Large React component (313 loc) managing CRUD for categories; decomposition tracked in backlog.
// fallow-ignore-next-line complexity
export default function CategoryManager() {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [badges, setBadges] = useState<SavedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Create state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [cats, b] = await Promise.all([getAllCategories(), getAllBadges()]);
    setCategories(cats);
    setBadges(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const badgeCountFor = (id: number) => badges.filter((b) => b.categoryId === id).length;

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await createCategory(name, undefined, newDesc.trim() || undefined);
    const cat = await getCategoryById(id);
    if (cat) setCategories((prev) => [...prev, cat]);
    setNewName('');
    setNewDesc('');
    setCatError(null);
  }, [newName, newDesc]);

  const handleSave = useCallback(
    async (id: number) => {
      try {
        await updateCategory(id, {
          name: editName.trim(),
          description: editDesc.trim() || undefined,
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, name: editName.trim(), description: editDesc.trim() } : c,
          ),
        );
        setEditingId(null);
        setCatError(null);
      } catch (err) {
        setCatError(err instanceof Error ? err.message : 'Failed to update');
      }
    },
    [editName, editDesc],
  );

  const handleDeleteKeepBadges = useCallback(async (id: number) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setBadges((prev) =>
        prev.map((b) => (b.categoryId === id ? { ...b, categoryId: undefined } : b)),
      );
      setDeleteTarget(null);
      setCatError(null);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }, []);

  const handleDeleteWithBadges = useCallback(async (id: number) => {
    try {
      await deleteCategoryAndBadges(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setBadges((prev) => prev.filter((b) => b.categoryId !== id));
      setDeleteTarget(null);
      setCatError(null);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }, []);

  const userCategories = categories.filter((c) => !c.readonly);
  const defaultCategories = categories.filter((c) => c.readonly);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Create new ───────────────────────────────── */}
      <div className="card glass-card">
        <div className="card-body p-4">
          <h3 className="card-title text-base">Create Category</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input input-bordered input-sm flex-1"
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="input input-bordered input-sm flex-1"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm shrink-0"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────── */}
      {catError && (
        <div className="alert alert-error alert-soft text-sm">
          <span>{catError}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => setCatError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Your categories ──────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold mb-3">Your Categories ({userCategories.length})</h3>
        {userCategories.length === 0 ? (
          <p className="text-sm text-base-content/50">
            No custom categories yet. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {userCategories.map((cat) => (
              <div key={cat.id} className="card glass-card">
                <div className="card-body p-3">
                  {editingId === cat.id ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        className="input input-bordered input-sm flex-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                      />
                      <input
                        className="input input-bordered input-sm flex-1"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description (optional)"
                      />
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={() => handleSave(cat.id!)}
                        disabled={!editName.trim()}
                      >
                        Save
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="badge badge-xs">{badgeCountFor(cat.id!)} badges</span>
                        {cat.description && (
                          <span className="text-xs text-base-content/40 truncate hidden sm:inline">
                            — {cat.description}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            setEditingId(cat.id!);
                            setEditName(cat.name);
                            setEditDesc(cat.description ?? '');
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => setDeleteTarget(cat.id!)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Default categories (read-only) ───────────── */}
      <div>
        <h3 className="text-base font-semibold mb-3">
          Gallery Categories ({defaultCategories.length})
        </h3>
        <p className="text-sm text-base-content/50 mb-3">
          These are available in the builder for organizing your badges. They cannot be modified.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {defaultCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 text-sm p-2 rounded-box bg-base-200"
            >
              <span className="font-medium truncate">{cat.name}</span>
              <span className="badge badge-xs shrink-0">{badgeCountFor(cat.id!)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete modal ─────────────────────────────── */}
      <dialog className={`modal ${deleteTarget !== null ? 'modal-open' : ''}`}>
        <div className="modal-box flex flex-col gap-5">
          {deleteTarget !== null &&
            (() => {
              const cat = categories.find((c) => c.id === deleteTarget);
              const count = badgeCountFor(deleteTarget);
              if (count === 0) {
                return (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-bold">Delete {cat?.name}</h3>
                      <p className="text-sm text-base-content/60">
                        This category is empty. Delete it permanently?
                      </p>
                    </div>
                    <div className="modal-action">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleteTarget(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleDeleteKeepBadges(deleteTarget)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                );
              }
              return (
                <>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold">Delete {cat?.name}</h3>
                    <p className="text-sm text-base-content/60">
                      Contains{' '}
                      <strong>
                        {count} badge{count !== 1 ? 's' : ''}
                      </strong>
                      . Choose what to do:
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      className="btn btn-outline btn-sm justify-start"
                      onClick={() => handleDeleteKeepBadges(deleteTarget)}
                    >
                      Move badges to Uncategorized
                    </button>
                    <button
                      className="btn btn-error btn-outline btn-sm justify-start"
                      onClick={() => handleDeleteWithBadges(deleteTarget)}
                    >
                      Delete all {count} badge{count !== 1 ? 's' : ''} permanently
                    </button>
                  </div>
                  <div className="modal-action">
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setDeleteTarget(null)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
