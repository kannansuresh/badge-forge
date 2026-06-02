import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const galleryCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/gallery' }),
  schema: z.object({
    categoryName: z.string(),
    categorySlug: z.string(),
    categoryDescription: z.string().optional(),
    badges: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        message: z.string(),
        color: z.string(),
        logo: z.string().optional(),
        logoColor: z.string().optional(),
        style: z
          .enum(['flat', 'flat-square', 'plastic', 'for-the-badge', 'social'])
          .optional()
          .default('flat'),
        labelColor: z.string().optional(),
      }),
    ),
  }),
});

export const collections = {
  gallery: galleryCollection,
};
