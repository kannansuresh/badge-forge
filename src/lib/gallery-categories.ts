/**
 * Gallery categories — auto-discovered from src/content/gallery/*.json.
 * Used to pre-populate the user's category list so they can
 * organize their own badges using the same taxonomy.
 *
 * Add a new JSON file to src/content/gallery/ and its category
 * will be picked up automatically — no code changes needed.
 */
export interface GalleryCategory {
  name: string;
  slug: string;
  description: string;
}

interface GalleryJsonShape {
  categoryName: string;
  categorySlug: string;
  categoryDescription?: string;
}

/** Auto-discover all gallery JSON files and extract category metadata. */
const galleryModules = import.meta.glob<{ default: GalleryJsonShape }>(
  '../content/gallery/**/*.json',
  { eager: true },
);

export const GALLERY_CATEGORIES: GalleryCategory[] = Object.values(galleryModules)
  .map((m) => ({
    name: m.default.categoryName,
    slug: m.default.categorySlug,
    description: m.default.categoryDescription ?? '',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
