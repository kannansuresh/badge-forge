import Dexie, { type EntityTable } from 'dexie';

// ── Session-storage clipboard (gallery → builder hand-off) ─────
/** Key used to pass badge config from gallery cards to the Live Studio builder. */
export const CLIPBOARD_KEY = 'badgecraft-clipboard';

export interface BadgeClipboard {
  label: string;
  message: string;
  color: string;
  logo?: string | undefined;
  logoColor?: string | undefined;
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social' | undefined;
  labelColor?: string | undefined;
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
  style: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor: string;
  /** shields.io built URL at time of save */
  shieldsUrl: string;
  /** ISO timestamp of when the badge was saved */
  savedAt: string;
  /** Optional user-editable name for the badge */
  name: string;
}

// ── Dexie database declaration ───────────────────────────────────
export interface CachedIcon {
  slug: string;
  svg: string;
  cachedAt: string;
}

const db = new Dexie('BadgeCraftDB') as Dexie & {
  badges: EntityTable<SavedBadge, 'id'>;
  icons: EntityTable<CachedIcon, 'slug'>;
};

db.version(1).stores({
  badges: '++id, savedAt, name, label, message',
});

db.version(2).stores({
  badges: '++id, savedAt, name, label, message',
  icons: 'slug',
});

// ── Icon preview cache ──────────────────────────────────────────
const ICON_PREVIEW_KEY = 'badgecraft-icon-previews';
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
  style?: string | undefined;
  labelColor?: string | undefined;
}): string {
  const { label, message, color, logo, logoColor, style, labelColor } = params;
  const escLabel = encodeURIComponent(escapeShieldsText(label));
  const escMessage = encodeURIComponent(escapeShieldsText(message));
  const base = `https://img.shields.io/badge/${escLabel}-${escMessage}-${color}`;
  const qs = new URLSearchParams();
  if (logo) qs.set('logo', logo);
  if (logoColor) qs.set('logoColor', logoColor);
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

/** Check if an identical badge already exists */
export async function isDuplicate(params: {
  label: string;
  message: string;
  color: string;
  logo: string;
  logoColor: string;
  style: string;
  labelColor: string;
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
        b.style === params.style &&
        b.labelColor === params.labelColor,
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

/** Get all saved badges, newest first */
export async function getAllBadges(): Promise<SavedBadge[]> {
  return db.badges.orderBy('savedAt').reverse().toArray();
}

/** Delete a badge by id */
export async function deleteBadge(id: number): Promise<void> {
  await db.badges.delete(id);
}

/** Delete all saved badges */
export async function clearAllBadges(): Promise<void> {
  await db.badges.clear();
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

/** Export badges as a plain JSON object (human-readable snapshot) */
export async function exportBadgesJson(): Promise<string> {
  const badges = await getAllBadges();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      badges,
    },
    null,
    2,
  );
}

/** Import badges from a plain JSON snapshot */
export async function importBadgesJson(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  if (!data.badges || !Array.isArray(data.badges)) {
    throw new Error('Invalid badge snapshot: missing "badges" array');
  }
  // Clear existing and bulk-insert
  await db.transaction('rw', db.badges, async () => {
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
    }));
    await db.badges.bulkAdd(toInsert);
  });
  return data.badges.length;
}
