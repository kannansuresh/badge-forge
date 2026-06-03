import Dexie, { type EntityTable } from 'dexie';

// ── Session-storage clipboard (gallery → builder hand-off) ─────
/** Key used to pass badge config from gallery cards to the Live Studio builder. */
export const CLIPBOARD_KEY = 'badgeforge-clipboard';

export interface BadgeClipboard {
  label: string;
  message: string;
  color: string;
  logo?: string | undefined;
  logoColor?: string | undefined;
  logoSize?: string | undefined;
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social' | undefined;
  labelColor?: string | undefined;
  categorySlug?: string | undefined;
  categoryId?: number | undefined;
}

/** Write badge config so the builder can pick it up after navigation. */
export function writeClipboard(badge: BadgeClipboard): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(badge));
}

/** Read and consume the clipboard. Returns null if nothing was stored. */
export function readClipboard(): BadgeClipboard | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(CLIPBOARD_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(CLIPBOARD_KEY);
  try {
    return JSON.parse(raw) as BadgeClipboard;
  } catch {
    return null;
  }
}

// ── Badge configuration stored in IndexedDB ──────────────────────
export interface SavedBadge {
  id?: number; // auto-incremented primary key
  label: string;
  message: string;
  color: string;
  logo: string;
  logoColor: string;
  logoSize: string;
  style: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor: string;
  /** shields.io built URL at time of save */
  shieldsUrl: string;
  /** ISO timestamp of when the badge was saved */
  savedAt: string;
  /** Optional user-editable name for the badge */
  name: string;
  /** FK to categories.id; undefined = uncategorized */
  categoryId?: number | undefined;
}

// ── User-defined categories ─────────────────────────────────
export interface UserCategory {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  /** Gallery-seeded categories are readonly (cannot be renamed or deleted). */
  readonly?: boolean;
}

// ── Dexie database declaration ───────────────────────────────────
export interface CachedIcon {
  slug: string;
  svg: string;
  cachedAt: string;
}

const db = new Dexie('BadgeForgeDB') as Dexie & {
  badges: EntityTable<SavedBadge, 'id'>;
  icons: EntityTable<CachedIcon, 'slug'>;
  categories: EntityTable<UserCategory, 'id'>;
};

db.version(1).stores({
  badges: '++id, savedAt, name, label, message',
});

db.version(2).stores({
  badges: '++id, savedAt, name, label, message',
  icons: 'slug',
});

db.version(3).stores({
  badges: '++id, savedAt, name, label, message, categoryId',
  icons: 'slug',
  categories: '++id, name, slug',
});

db.version(4).stores({
  badges: '++id, savedAt, name, label, message, categoryId',
  icons: 'slug',
  categories: '++id, name, slug',
});

// ── Icon preview cache ──────────────────────────────────────────
const ICON_PREVIEW_KEY = 'badgeforge-icon-previews';
const CDN_BASE = 'https://cdn.simpleicons.org';

/** Whether the user has opted into icon previews */
export function getIconPreviewPref(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ICON_PREVIEW_KEY) === 'true';
}

export function setIconPreviewPref(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ICON_PREVIEW_KEY, String(enabled));
}

/** Fetch an SVG from CDN + cache to Dexie. Returns cached copy if available. */
export async function getIconSvg(slug: string): Promise<string> {
  // Check cache first
  const cached = await db.icons.get(slug);
  if (cached) return cached.svg;

  // Fetch from CDN
  const res = await fetch(`${CDN_BASE}/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Failed to fetch icon: ${slug}`);
  const svg = await res.text();

  // Cache it (fire-and-forget — don't block on write)
  db.icons.put({ slug, svg, cachedAt: new Date().toISOString() }).catch(() => {});

  return svg;
}

/** Clear all cached icon SVGs */
export async function clearIconCache(): Promise<void> {
  await db.icons.clear();
}

/** Get count of cached icons */
export async function getIconCacheCount(): Promise<number> {
  return db.icons.count();
}

// ── Category CRUD ─────────────────────────────────────────────
/** Create a new user category. Returns the auto-generated id. */
export async function createCategory(
  name: string,
  slug?: string,
  description?: string,
): Promise<number> {
  const id = await db.categories.add({
    name,
    slug:
      slug ??
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    description: description ?? '',
    createdAt: new Date().toISOString(),
    readonly: false,
  });
  return id as number;
}

/** Seed default categories from the gallery taxonomy (idempotent per category — only adds missing slugs). */
export async function seedDefaultCategories(): Promise<void> {
  const { GALLERY_CATEGORIES } = await import('./gallery-categories');

  await db.transaction('rw', db.categories, async () => {
    for (const cat of GALLERY_CATEGORIES) {
      const exists = await db.categories.where('slug').equals(cat.slug).first();
      if (!exists) {
        await db.categories.add({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          createdAt: new Date().toISOString(),
          readonly: true,
        });
      }
    }
  });
}

/** Get all categories, ordered by name. */
export async function getAllCategories(): Promise<UserCategory[]> {
  return db.categories.orderBy('name').toArray();
}

/** Get a single category by id. */
export async function getCategoryById(id: number): Promise<UserCategory | undefined> {
  return db.categories.get(id);
}

/** Update category name and/or description. Throws if category is readonly. */
export async function updateCategory(
  id: number,
  updates: { name?: string; description?: string },
): Promise<void> {
  const cat = await db.categories.get(id);
  if (cat?.readonly) throw new Error('Cannot edit a default gallery category.');
  await db.categories.update(id, updates);
}

/** Delete a category and reassign its badges to uncategorized. Throws if readonly. */
export async function deleteCategory(id: number): Promise<void> {
  const cat = await db.categories.get(id);
  if (cat?.readonly) throw new Error('Cannot delete a default gallery category.');

  await db.transaction('rw', db.categories, db.badges, async () => {
    const affected = await db.badges.where('categoryId').equals(id).toArray();
    for (const badge of affected) {
      await db.badges.update(badge.id!, { categoryId: undefined });
    }
    await db.categories.delete(id);
  });
}

/** Delete a category and all badges in it. Returns count of deleted badges. Throws if readonly. */
export async function deleteCategoryAndBadges(id: number): Promise<number> {
  const cat = await db.categories.get(id);
  if (cat?.readonly) throw new Error('Cannot delete a default gallery category.');

  let count = 0;
  await db.transaction('rw', db.categories, db.badges, async () => {
    const affected = await db.badges.where('categoryId').equals(id).toArray();
    count = affected.length;
    for (const badge of affected) {
      await db.badges.delete(badge.id!);
    }
    await db.categories.delete(id);
  });
  return count;
}

// ── Helper exports ────────────────────────────────────────────────
export { db };

/** Escape shields.io path text: - → --, _ → __ */
function escapeShieldsText(text: string): string {
  return text.replace(/-/g, '--').replace(/_/g, '__');
}

/** Build a shields.io badge URL from its parameters */
export function buildShieldsUrl(params: {
  label: string;
  message: string;
  color: string;
  logo?: string | undefined;
  logoColor?: string | undefined;
  logoSize?: string | undefined;
  style?: string | undefined;
  labelColor?: string | undefined;
}): string {
  const { label, message, color, logo, logoColor, logoSize, style, labelColor } = params;
  const escLabel = encodeURIComponent(escapeShieldsText(label));
  const escMessage = encodeURIComponent(escapeShieldsText(message));
  const base = `https://img.shields.io/badge/${escLabel}-${escMessage}-${color}`;
  const qs = new URLSearchParams();
  if (logo) qs.set('logo', logo);
  if (logoColor) qs.set('logoColor', logoColor);
  if (logoSize) qs.set('logoSize', logoSize);
  if (style && style !== 'flat') qs.set('style', style);
  if (labelColor) qs.set('labelColor', labelColor);
  const qsStr = qs.toString();
  return qsStr ? `${base}?${qsStr}` : base;
}

/** Construct Markdown badge string */
export function toMarkdown(shieldsUrl: string, alt?: string | undefined): string {
  const label = alt || 'badge';
  return `![${label}](${shieldsUrl})`;
}

/** Construct HTML <img> badge string */
export function toHtml(shieldsUrl: string, alt?: string | undefined): string {
  const label = alt || 'badge';
  return `<img src="${shieldsUrl}" alt="${label}" />`;
}

/** Construct reStructuredText badge string */
export function toRst(shieldsUrl: string, alt?: string | undefined): string {
  const label = alt || 'badge';
  return `.. image:: ${shieldsUrl}\n   :alt: ${label}`;
}

/** Construct AsciiDoc badge string */
export function toAsciiDoc(shieldsUrl: string, alt?: string | undefined): string {
  const label = alt || 'badge';
  return `image:${shieldsUrl}[${label}]`;
}

/** Construct Textile badge string */
export function toTextile(shieldsUrl: string, alt?: string | undefined): string {
  const label = alt || 'badge';
  return `!${shieldsUrl}(${label})!`;
}

/** Check if an identical badge (same visuals AND category) already exists */
export async function isDuplicate(params: {
  label: string;
  message: string;
  color: string;
  logo: string;
  logoColor: string;
  logoSize: string;
  style: string;
  labelColor: string;
  categoryId?: number | undefined;
}): Promise<boolean> {
  const match = await db.badges
    .where('label')
    .equals(params.label)
    .and(
      (b) =>
        b.message === params.message &&
        b.color === params.color &&
        b.logo === params.logo &&
        b.logoColor === params.logoColor &&
        b.logoSize === params.logoSize &&
        b.style === params.style &&
        b.labelColor === params.labelColor &&
        (b.categoryId ?? undefined) === (params.categoryId ?? undefined),
    )
    .first();
  return !!match;
}

/** Save a badge configuration to IndexedDB */
export async function saveBadge(
  params: Omit<SavedBadge, 'id' | 'shieldsUrl' | 'savedAt'>,
): Promise<number> {
  const shieldsUrl = buildShieldsUrl(params);
  const id = await db.badges.add({
    ...params,
    shieldsUrl,
    savedAt: new Date().toISOString(),
  });
  return id as number;
}

/** Get all saved badges, newest first, optionally filtered by category */
export async function getAllBadges(
  categoryFilter?: 'all' | 'uncategorized' | number,
): Promise<SavedBadge[]> {
  const collection = db.badges.orderBy('savedAt').reverse();
  if (categoryFilter === 'uncategorized') {
    return collection.filter((b) => b.categoryId === undefined || b.categoryId === null).toArray();
  }
  if (typeof categoryFilter === 'number') {
    return collection.filter((b) => b.categoryId === categoryFilter).toArray();
  }
  return collection.toArray();
}

/** Get a single badge by id */
export async function getBadgeById(id: number): Promise<SavedBadge | undefined> {
  return db.badges.get(id);
}

/** Delete a badge by id */
export async function deleteBadge(id: number): Promise<void> {
  await db.badges.delete(id);
}

/** Delete all saved badges */
export async function clearAllBadges(): Promise<void> {
  await db.badges.clear();
}

/** Delete all user-created (non-readonly) categories. Returns count deleted. */
export async function clearUserCategories(): Promise<number> {
  const userCategories = await db.categories.filter((c) => !c.readonly).toArray();
  await db.transaction('rw', db.categories, db.badges, async () => {
    for (const cat of userCategories) {
      // Reassign badges in these categories to uncategorized
      const affected = await db.badges.where('categoryId').equals(cat.id!).toArray();
      for (const badge of affected) {
        await db.badges.update(badge.id!, { categoryId: undefined });
      }
      await db.categories.delete(cat.id!);
    }
  });
  return userCategories.length;
}

/** Export entire database as a JSON blob */
export async function exportDatabase(): Promise<Blob> {
  await import('dexie-export-import');
  const blob = await db.export();
  return blob;
}

/** Import a database from a JSON file, replacing current data */
export async function importDatabase(file: File): Promise<void> {
  await import('dexie-export-import');
  await db.import(file);
}

/** Export badges and user-created categories as a plain JSON snapshot */
export async function exportBadgesJson(): Promise<string> {
  const badges = await getAllBadges();
  const categories = await getAllCategories();
  // Exclude default gallery (readonly) categories — they'll be re-seeded on import
  const userCategories = categories.filter((c) => !c.readonly);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 2,
      categories: userCategories,
      badges,
    },
    null,
    2,
  );
}

/** Import badges from a plain JSON snapshot (v1 or v2) */
export async function importBadgesJson(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  if (!data.badges || !Array.isArray(data.badges)) {
    throw new Error('Invalid badge snapshot: missing "badges" array');
  }

  await db.transaction('rw', db.badges, db.categories, async () => {
    // Build oldId → newId map for v2 imports with categories
    const idMap = new Map<number, number>();
    if (data.version === 2 && Array.isArray(data.categories) && data.categories.length > 0) {
      await db.categories.clear();
      for (const cat of data.categories as Array<Record<string, unknown>>) {
        const oldId = typeof cat.id === 'number' ? cat.id : undefined;
        const newId = (await db.categories.add({
          name: String(cat.name || ''),
          slug: String(cat.slug || ''),
          description: String(cat.description || ''),
          createdAt: String(cat.createdAt || new Date().toISOString()),
          readonly: Boolean(cat.readonly),
        })) as number;
        if (oldId !== undefined) idMap.set(oldId, newId);
      }
    }

    // Import badges with remapped category IDs
    await db.badges.clear();
    const toInsert = data.badges.map((b: Record<string, unknown>) => ({
      label: String(b.label || ''),
      message: String(b.message || ''),
      color: String(b.color || ''),
      logo: String(b.logo || ''),
      logoColor: String(b.logoColor || ''),
      style: (b.style as SavedBadge['style']) || 'flat',
      labelColor: String(b.labelColor || ''),
      shieldsUrl: String(b.shieldsUrl || ''),
      savedAt: String(b.savedAt || new Date().toISOString()),
      name: String(b.name || ''),
      categoryId:
        typeof b.categoryId === 'number' ? (idMap.get(b.categoryId) ?? b.categoryId) : undefined,
    }));
    await db.badges.bulkAdd(toInsert);
  });

  return data.badges.length;
}
