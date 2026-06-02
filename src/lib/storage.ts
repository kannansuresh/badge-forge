import Dexie, { type EntityTable } from 'dexie';

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
const db = new Dexie('BadgeCraftDB') as Dexie & {
  badges: EntityTable<SavedBadge, 'id'>;
};

db.version(1).stores({
  badges: '++id, savedAt, name, label, message',
});

// ── Helper exports ────────────────────────────────────────────────
export { db };

/** Build a shields.io badge URL from its parameters */
export function buildShieldsUrl(params: {
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  style?: string;
  labelColor?: string;
}): string {
  const { label, message, color, logo, logoColor, style, labelColor } = params;
  const base = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${color}`;
  const qs = new URLSearchParams();
  if (logo) qs.set('logo', logo);
  if (logoColor) qs.set('logoColor', logoColor);
  if (style && style !== 'flat') qs.set('style', style);
  if (labelColor) qs.set('labelColor', labelColor);
  const qsStr = qs.toString();
  return qsStr ? `${base}?${qsStr}` : base;
}

/** Construct Markdown badge string */
export function toMarkdown(shieldsUrl: string, alt?: string): string {
  const label = alt || 'badge';
  return `![${label}](${shieldsUrl})`;
}

/** Construct HTML <img> badge string */
export function toHtml(shieldsUrl: string, alt?: string): string {
  const label = alt || 'badge';
  return `<img src="${shieldsUrl}" alt="${label}" />`;
}

/** Save a badge configuration to IndexedDB */
export async function saveBadge(params: Omit<SavedBadge, 'id' | 'shieldsUrl' | 'savedAt'>): Promise<number> {
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
  const DexieExportImport = await import('dexie-export-import');
  const blob = await db.export();
  return blob;
}

/** Import a database from a JSON file, replacing current data */
export async function importDatabase(file: File): Promise<void> {
  const DexieExportImport = await import('dexie-export-import');
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
