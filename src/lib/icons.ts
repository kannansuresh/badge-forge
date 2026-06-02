/**
 * Simple Icons helper — loads the full icon dataset and provides
 * a search/filter function for the LiveStudio autocomplete.
 */
export interface SimpleIconData {
  title: string;
  slug: string;
  hex: string;
  source: string;
  svg: string;
  path: string;
  guidelines?: string;
  license?: { type: string; url?: string };
  aliases?: {
    aka?: string[];
    dup?: Array<{ title: string; slug?: string; hex?: string }>;
    loc?: Record<string, string>;
    old?: string[];
  };
}

let iconsCache: SimpleIconData[] | null = null;

/** Load all simple-icons data (cached singleton) */
export async function loadIcons(): Promise<SimpleIconData[]> {
  if (iconsCache) return iconsCache;

  const mod = await import('simple-icons/icons.json');
  iconsCache = (mod.default || mod) as SimpleIconData[];
  return iconsCache!;
}

/**
 * Search icons by title, slug, or aliases.
 * Returns the best matches sorted by relevance.
 */
export function searchIcons(
  query: string,
  icons: SimpleIconData[],
  limit = 20,
): SimpleIconData[] {
  const q = query.toLowerCase().trim();
  if (!q) return icons.slice(0, limit);

  const scored = icons
    .map((icon) => {
      let score = 0;
      const title = icon.title.toLowerCase();
      const slug = icon.slug.toLowerCase();

      // Exact matches
      if (title === q || slug === q) score += 100;
      // Starts with
      if (title.startsWith(q) || slug.startsWith(q)) score += 50;
      // Contains
      if (title.includes(q)) score += 30;
      else if (slug.includes(q)) score += 25;

      // Alias matches
      const aka = (icon.aliases?.aka || []).map((a) => a.toLowerCase());
      const old = (icon.aliases?.old || []).map((a) => a.toLowerCase());
      if (aka.some((a) => a === q)) score += 80;
      if (aka.some((a) => a.includes(q))) score += 20;
      if (old.some((a) => a.includes(q))) score += 15;

      return { icon, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.icon);

  return scored;
}
