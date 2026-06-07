/**
 * Simple Icons helper — loads the full icon dataset and provides
 * a search/filter function for the LiveStudio autocomplete.
 *
 * The raw JSON data from simple-icons does NOT include a `slug` field
 * (it's only present in the named ESM exports). We normalize every
 * icon on load by computing `slug` from `title` when it's missing,
 * using the same rules as the simple-icons SDK.
 */
export interface SimpleIconData {
  title: string;
  slug: string;
  hex: string;
  source: string;
  svg?: string;
  path?: string;
  guidelines?: string;
  license?: { type: string; url?: string };
  aliases?: {
    aka?: string[];
    dup?: Array<{ title: string; slug?: string; hex?: string }>;
    loc?: Record<string, string>;
    old?: string[];
  };
}

/** Mirrors simple-icons SDK's titleToSlug logic */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/\./g, 'dot')
    .replace(/&/g, 'and')
    .replace(/ø/g, 'o')
    .replace(/[«»]/g, '')
    .replace(/[''`´]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(\d{2,})/, '_$1')
    .replace(/^(\d)/, '_$1');
}

let iconsCache: SimpleIconData[] | null = null;

/** Load all simple-icons data (cached singleton), normalizing slugs */
export async function loadIcons(): Promise<SimpleIconData[]> {
  if (iconsCache) return iconsCache;

  // Import all named exports from the main simple-icons module.
  // Each export (siDotenv, siDotnet, …) is a full icon object with slug.
  const mod = await import('simple-icons/icons.json');
  const raw: Record<string, unknown>[] = Array.isArray(mod.default)
    ? (mod.default as Record<string, unknown>[])
    : Array.isArray(mod)
      ? (mod as Record<string, unknown>[])
      : [];

  iconsCache = raw.map((icon) => {
    const title = String(icon.title);
    return {
      title,
      slug: (icon.slug as string) || titleToSlug(title),
      hex: String(icon.hex || ''),
      source: String(icon.source || ''),
      guidelines: icon.guidelines as string | undefined,
      license: icon.license as { type: string; url?: string } | undefined,
      aliases: icon.aliases as SimpleIconData['aliases'],
    } as SimpleIconData;
  });

  return iconsCache;
}

/** Score an icon against a search query. Higher = better match. */
function scoreIcon(icon: SimpleIconData, q: string): number {
  let score = 0;
  const title = icon.title.toLowerCase();
  const slug = icon.slug.toLowerCase();

  // Exact matches
  if (title === q || slug === q) score += 100;
  // Starts with
  if (title.startsWith(q) || slug.startsWith(q)) score += 50;
  // Contains
  if (title.includes(q)) score += 30;
  if (slug.includes(q)) score += 25;

  // Alias matches
  const aka = (icon.aliases?.aka || []).map((a) => a.toLowerCase());
  const old = (icon.aliases?.old || []).map((a) => a.toLowerCase());
  if (aka.some((a) => a === q)) score += 80;
  if (aka.some((a) => a.includes(q))) score += 20;
  if (old.some((a) => a.includes(q))) score += 15;

  return score;
}

/**
 * Search icons by title, slug, or aliases.
 * Returns the best matches sorted by relevance.
 */
export function searchIcons(query: string, icons: SimpleIconData[], limit = 20): SimpleIconData[] {
  const q = query.toLowerCase().trim();
  if (!q) return icons.slice(0, limit);

  const scored = icons
    .map((icon) => ({ icon, score: scoreIcon(icon, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.icon);

  return scored;
}
