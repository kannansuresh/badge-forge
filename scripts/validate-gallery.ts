/**
 * Gallery badge validation script.
 * Run with: bun run validate
 *
 * Validates all JSON files in src/content/gallery/ for:
 * - Valid JSON syntax
 * - Required fields and types
 * - Duplicate badge IDs (within and across files)
 * - Duplicate category slugs across files
 * - Valid hex color codes
 * - Valid style values
 * - Logo existence in simple-icons (warning only)
 * - Kebab-case slug convention
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadIcons } from '../src/lib/icons';

// ── Constants ───────────────────────────────────────────────────
const ALLOWED_STYLES = ['flat', 'flat-square', 'plastic', 'for-the-badge', 'social'] as const;
const HEX_RE = /^[0-9a-fA-F]{3,8}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GALLERY_DIR = join(import.meta.dirname, '..', 'src', 'content', 'gallery');

interface GalleryBadge {
  id: string;
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  style?: string;
  labelColor?: string;
}

interface GalleryCategory {
  categoryName: string;
  categorySlug: string;
  categoryDescription?: string;
  badges: GalleryBadge[];
}

interface Issue {
  file: string;
  message: string;
}

// ── Collect JSON files recursively ─────────────────────────────
function collectJsonFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

// ── Manual schema validation ───────────────────────────────────
function validateCategory(data: unknown, file: string, errors: Issue[]): data is GalleryCategory {
  if (!data || typeof data !== 'object') {
    errors.push({ file, message: 'Not a JSON object' });
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.categoryName !== 'string' || !obj.categoryName.trim()) {
    errors.push({
      file,
      message: 'Missing or invalid "categoryName" (must be a non-empty string)',
    });
  }
  if (typeof obj.categorySlug !== 'string' || !obj.categorySlug.trim()) {
    errors.push({
      file,
      message: 'Missing or invalid "categorySlug" (must be a non-empty string)',
    });
  }
  if (obj.categoryDescription !== undefined && typeof obj.categoryDescription !== 'string') {
    errors.push({ file, message: '"categoryDescription" must be a string if provided' });
  }
  if (!Array.isArray(obj.badges) || obj.badges.length === 0) {
    errors.push({ file, message: '"badges" must be a non-empty array' });
    return false;
  }

  for (let i = 0; i < obj.badges.length; i++) {
    const badge = obj.badges[i] as Record<string, unknown>;
    const pfx = `badges[${i}]`;

    if (typeof badge.id !== 'string' || !badge.id.trim()) {
      errors.push({ file, message: `${pfx}: "id" is required (non-empty string)` });
    }
    if (typeof badge.label !== 'string') {
      errors.push({ file, message: `${pfx}: "label" must be a string` });
    }
    if (typeof badge.message !== 'string' || !badge.message.trim()) {
      errors.push({ file, message: `${pfx}: "message" is required (non-empty string)` });
    }
    if (typeof badge.color !== 'string' || !badge.color.trim()) {
      errors.push({ file, message: `${pfx}: "color" is required (non-empty string)` });
    }
    if (badge.logo !== undefined && typeof badge.logo !== 'string') {
      errors.push({ file, message: `${pfx}: "logo" must be a string if provided` });
    }
    if (badge.logoColor !== undefined && typeof badge.logoColor !== 'string') {
      errors.push({ file, message: `${pfx}: "logoColor" must be a string if provided` });
    }
    if (badge.labelColor !== undefined && typeof badge.labelColor !== 'string') {
      errors.push({ file, message: `${pfx}: "labelColor" must be a string if provided` });
    }
    if (badge.style !== undefined) {
      if (
        typeof badge.style !== 'string' ||
        !ALLOWED_STYLES.includes(badge.style as (typeof ALLOWED_STYLES)[number])
      ) {
        errors.push({
          file,
          message: `${pfx}: invalid "style" "${String(badge.style)}" — must be: ${ALLOWED_STYLES.join(', ')}`,
        });
      }
    }
  }

  return errors.every((e) => e.file !== file);
}

// ── Main validation ─────────────────────────────────────────────
async function validate(): Promise<boolean> {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const relPath = (p: string) => relative(GALLERY_DIR, p);

  // 1. Collect and parse all JSON files
  const files = collectJsonFiles(GALLERY_DIR);
  console.log(`  Found ${files.length} gallery JSON file(s)\n`);

  if (files.length === 0) {
    errors.push({ file: '(root)', message: 'No JSON files found in src/content/gallery/' });
    printResults(errors, warnings);
    return false;
  }

  const parsed: Array<{ file: string; data: unknown }> = [];
  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf-8');
      parsed.push({ file, data: JSON.parse(raw) });
    } catch (e) {
      errors.push({
        file: relPath(file),
        message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // 2. Validate each file
  const validated: Array<{ file: string; data: GalleryCategory }> = [];
  for (const { file, data } of parsed) {
    if (validateCategory(data, relPath(file), errors)) {
      validated.push({ file, data: data as GalleryCategory });
    }
  }

  if (errors.length > 0) {
    printResults(errors, warnings);
    return false;
  }

  // 3. Check duplicate category slugs across files
  const slugMap = new Map<string, string[]>();
  for (const { file, data } of validated) {
    const list = slugMap.get(data.categorySlug) ?? [];
    list.push(relPath(file));
    slugMap.set(data.categorySlug, list);
  }
  for (const [slug, fileList] of slugMap) {
    if (fileList.length > 1) {
      errors.push({
        file: fileList[0],
        message: `Duplicate categorySlug "${slug}" in: ${fileList.join(', ')}`,
      });
    }
  }

  // 4. Validate badges
  const allBadgeIds = new Map<string, string[]>();

  for (const { file, data } of validated) {
    // Duplicates within same file
    const seen = new Map<string, number>();
    for (const badge of data.badges) seen.set(badge.id, (seen.get(badge.id) ?? 0) + 1);
    for (const [id, count] of seen) {
      if (count > 1) {
        errors.push({
          file: relPath(file),
          message: `Duplicate badge id "${id}" (${count}× in this file)`,
        });
      }
    }

    // Track globally
    for (const badge of data.badges) {
      const fList = allBadgeIds.get(badge.id) ?? [];
      fList.push(relPath(file));
      allBadgeIds.set(badge.id, fList);
    }

    // Hex color validation (warning only — shields.io accepts named colors)
    for (const badge of data.badges) {
      if (!HEX_RE.test(badge.color)) {
        warnings.push({
          file: relPath(file),
          message: `Badge "${badge.id}": color "${badge.color}" is not a hex code (renders fine on shields.io, but hex is preferred)`,
        });
      }
      if (badge.logoColor && !HEX_RE.test(badge.logoColor)) {
        warnings.push({
          file: relPath(file),
          message: `Badge "${badge.id}": logoColor "${badge.logoColor}" is not a hex code`,
        });
      }
      if (badge.labelColor && !HEX_RE.test(badge.labelColor)) {
        warnings.push({
          file: relPath(file),
          message: `Badge "${badge.id}": labelColor "${badge.labelColor}" is not a hex code`,
        });
      }
    }

    // Slug convention
    if (!SLUG_RE.test(data.categorySlug)) {
      warnings.push({
        file: relPath(file),
        message: `categorySlug "${data.categorySlug}" should be kebab-case (a-z, 0-9, hyphens)`,
      });
    }
  }

  // 5. Cross-file badge ID duplicates (warning)
  for (const [id, fileList] of allBadgeIds) {
    if (fileList.length > 1) {
      warnings.push({
        file: fileList[0],
        message: `Badge id "${id}" appears in multiple files: ${fileList.join(', ')}`,
      });
    }
  }

  // 6. Logo validation against simple-icons (warning, case-insensitive)
  try {
    const icons = await loadIcons();
    // Build lookup: lowercase slug → official slug
    const logoSlugMap = new Map<string, string>();
    for (const icon of icons) {
      logoSlugMap.set(icon.slug.toLowerCase(), icon.slug);
    }
    for (const { file, data } of validated) {
      for (const badge of data.badges) {
        if (badge.logo) {
          const lookup = badge.logo.toLowerCase();
          const official = logoSlugMap.get(lookup);
          if (!official) {
            warnings.push({
              file: relPath(file),
              message: `Badge "${badge.id}": logo "${badge.logo}" not found in simple-icons (will render as text on badge)`,
            });
          } else if (official !== badge.logo) {
            warnings.push({
              file: relPath(file),
              message: `Badge "${badge.id}": logo "${badge.logo}" case-mismatch — simple-icons slug is "${official}"`,
            });
          }
        }
      }
    }
  } catch {
    warnings.push({
      file: '(global)',
      message: 'Could not load simple-icons data for logo validation (offline?)',
    });
  }

  printResults(errors, warnings);
  return errors.length === 0;
}

function printResults(errors: Issue[], warnings: Issue[]): void {
  console.log(`  ${errors.length} error(s), ${warnings.length} warning(s)\n`);

  if (errors.length > 0) {
    console.log('❌ ERRORS:\n');
    for (const { file, message } of errors) {
      console.log(`  ${file}`);
      console.log(`    → ${message}\n`);
    }
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    for (const { file, message } of warnings) {
      console.log(`  ${file}`);
      console.log(`    → ${message}\n`);
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All gallery files valid!\n');
  } else if (errors.length === 0) {
    console.log('✅ Pass (warnings are non-blocking)\n');
  } else {
    console.log('💥 FAILED — fix errors above before submitting.\n');
  }
}

// ── Entry point ─────────────────────────────────────────────────
const ok = await validate();
process.exit(ok ? 0 : 1);
