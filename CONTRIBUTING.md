# Contributing to BadgeForge

Thanks for helping build the best badge collection on the web! 🎉

## Adding New Badges

Badges are organized as JSON files in `src/content/gallery/`. Each file represents a **category** containing a list of badges.

### Quick Start

1. Create a new `.json` file in `src/content/gallery/` (or add to an existing category file)
2. Follow the schema below
3. Run `bun run validate` to check for errors
4. Submit a PR!

### JSON Schema

```jsonc
{
  // Category metadata
  "categoryName": "Cloud Storage", // required — display name
  "categorySlug": "cloud-storage", // required — URL slug (kebab-case: a-z, 0-9, hyphens)
  "categoryDescription": "Cloud storage…", // optional — shown on category card

  // Badges in this category (non-empty array)
  "badges": [
    {
      "id": "amazon-s3", // required — unique within file (kebab-case)
      "label": "", // required — left side text ("" for brand-only)
      "message": "Amazon S3", // required — right side text
      "color": "FF9900", // required — hex color WITHOUT # (e.g. FF9900)
      "logo": "amazons3", // optional — simple-icons slug (lowercase)
      "logoColor": "ffffff", // optional — logo color hex (default: white)
      "style": "for-the-badge", // optional — flat | flat-square | plastic | for-the-badge | social
      "labelColor": "333333", // optional — label background hex
    },
  ],
}
```

### Rules

| Rule                                     | Severity   | Checked By         |
| ---------------------------------------- | ---------- | ------------------ |
| Valid JSON syntax                        | ❌ Error   | `bun run validate` |
| Required fields present                  | ❌ Error   | `bun run validate` |
| `badges` is non-empty array              | ❌ Error   | `bun run validate` |
| No duplicate badge `id` within same file | ❌ Error   | `bun run validate` |
| No duplicate `categorySlug` across files | ❌ Error   | `bun run validate` |
| Colors should be hex codes               | ⚠️ Warning | `bun run validate` |
| Logo slugs should match simple-icons     | ⚠️ Warning | `bun run validate` |
| `categorySlug` should be kebab-case      | ⚠️ Warning | `bun run validate` |

### Validation

```bash
# Check all gallery files
bun run validate

# Full build (runs validation first)
bun run build
```

The validation runs automatically before every build. PRs with validation errors will fail CI.

### Finding Logo Slugs

BadgeForge uses [Simple Icons](https://simpleicons.org/) for brand logos. To find the correct slug:

1. Search [simpleicons.org](https://simpleicons.org)
2. Use the **lowercase** slug shown on the icon's page
3. Or type the brand name in the Forge's logo search field — it'll auto-complete

### Category Organization

- Put related badges in the same category file
- Use descriptive, concise category names
- Keep `categorySlug` as kebab-case (e.g., `cloud-storage`, `ci-cd`)
- Files can be in subdirectories — the folder path becomes part of the URL

### Need Help?

Open an issue or discussion on GitHub.
