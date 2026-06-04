/**
 * Canonical badge embed formats — matches shields.io options.
 * All components reference this single source of truth.
 * Order: URL, Markdown, reStructuredText, AsciiDoc, HTML
 */

export const COPY_FORMATS = [
  { key: 'url' as const, label: 'URL' },
  { key: 'md' as const, label: 'Markdown' },
  { key: 'rst' as const, label: 'rSt' },
  { key: 'asciidoc' as const, label: 'AsciiDoc' },
  { key: 'html' as const, label: 'HTML' },
];

export type CopyFormatKey = (typeof COPY_FORMATS)[number]['key'];

/** Formats shown as quick-copy buttons on badge cards. */
export const QUICK_COPY_FORMATS = COPY_FORMATS.slice(0, 3);

import { toAsciiDoc, toHtml, toMarkdown, toRst } from './storage';

/** Generate the snippet for a given format key. */
export function getSnippet(key: CopyFormatKey, shieldsUrl: string, alt?: string): string {
  switch (key) {
    case 'url':
      return shieldsUrl;
    case 'md':
      return toMarkdown(shieldsUrl, alt);
    case 'rst':
      return toRst(shieldsUrl, alt);
    case 'asciidoc':
      return toAsciiDoc(shieldsUrl, alt);
    case 'html':
      return toHtml(shieldsUrl, alt);
  }
}

/** Download the badge as an SVG file. */
export function downloadSvg(shieldsUrl: string, filename: string): void {
  const svgUrl = shieldsUrl.includes('?') ? `${shieldsUrl}&format=svg` : `${shieldsUrl}?format=svg`;
  const a = document.createElement('a');
  a.href = svgUrl;
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
