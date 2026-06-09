import React, { useState, useMemo, useCallback } from 'react';
import { Code2, Copy, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { buildShieldsUrl } from '../lib/storage';
import { COPY_FORMATS, getSnippet, type CopyFormatKey } from '../lib/formats';
import { copyToClipboard } from '../lib/dom';

export interface BadgeDetailProps {
  label: string;
  message: string;
  color: string;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
  style?: string;
  labelColor?: string;
  header?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function BadgeDetailView({
  label,
  message,
  color,
  logo,
  logoColor,
  logoSize,
  style = 'flat',
  labelColor,
  header,
  subtitle,
  actions,
}: BadgeDetailProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<CopyFormatKey | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);

  const shieldsUrl = useMemo(() => {
    return buildShieldsUrl({
      label,
      message,
      color,
      logo,
      logoColor,
      logoSize,
      style,
      labelColor,
    });
  }, [label, message, color, logo, logoColor, logoSize, style, labelColor]);

  const snippets = useMemo(() => {
    const map = {} as Record<CopyFormatKey, string>;
    for (const { key } of COPY_FORMATS) {
      map[key] = getSnippet(key, shieldsUrl, label ? `${label}: ${message}` : message);
    }
    return map;
  }, [shieldsUrl, label, message]);

  const copy = useCallback(
    async (key: CopyFormatKey) => {
      await copyToClipboard(snippets[key]);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    },
    [snippets],
  );

  return (
    <div className="space-y-4">
      {header}

      <div className="card glass-card overflow-hidden">
        {/* Preview image hero */}
        <div className="bg-base-200/50 px-6 py-14 flex items-center justify-center relative">
          {imgError ? (
            <span className="font-mono text-sm text-base-content/50">
              {label}-{message}-{color}
            </span>
          ) : (
            <img
              src={shieldsUrl}
              alt={label ? `${label}: ${message}` : message}
              className="transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              onError={() => setImgError(true)}
            />
          )}
          {/* Zoom controls */}
          <div className="join join-horizontal absolute bottom-3 right-3 opacity-70 hover:opacity-100 transition-opacity">
            <button
              className={`join-item btn btn-xs gap-1 ${zoom === 1 ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setZoom(1)}
              title="Actual size"
            >
              <ZoomOut className="w-3 h-3" /> Actual
            </button>
            <button
              className={`join-item btn btn-xs gap-1 ${zoom === 2 ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setZoom(2)}
              title="Magnified (2x)"
            >
              <ZoomIn className="w-3 h-3" /> Magnified
            </button>
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 space-y-5">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">
                {label ? `${label}: ${message}` : message}
              </h1>
              {subtitle}
            </div>
            <div className="flex gap-2 shrink-0">{actions}</div>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/60">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-sm border border-base-content/20"
                style={{ backgroundColor: `#${color}` }}
              />
              <span className="font-mono text-xs">#{color}</span>
            </span>
            {logo && <span className="badge badge-ghost badge-sm font-normal">{logo}</span>}
            <span className="badge badge-outline badge-sm">{style}</span>
            {labelColor && (
              <span className="inline-flex items-center gap-1">
                <span
                  class="w-3 h-3 rounded-sm border border-base-content/20"
                  style={{ backgroundColor: `#${labelColor}` }}
                />
                <span className="text-xs">label #{labelColor}</span>
              </span>
            )}
          </div>

          {/* Embed formats */}
          <div className="border-t border-base-300/30 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Code2 className="w-4 h-4" /> Embed
              </h2>
              <div className="flex gap-1">
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  {expanded ? 'Show less' : 'All formats'}
                </button>
                <a
                  className="btn btn-xs btn-ghost gap-1"
                  href={shieldsUrl.replace('?', '?format=svg&')}
                  download={`${message}.svg`}
                >
                  <Download className="w-3 h-3" /> SVG
                </a>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2">
              {COPY_FORMATS.slice(0, 3).map(({ key, label: lbl }) => (
                <button
                  key={key}
                  className={`btn btn-xs gap-1 ${copied === key ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => copy(key)}
                >
                  <Copy className="w-3 h-3" /> {copied === key ? 'Copied' : lbl}
                </button>
              ))}
            </div>

            {/* Expanded code formats */}
            {expanded && (
              <div className="space-y-2 mt-3">
                {COPY_FORMATS.map(({ key, label: lbl }) => (
                  <div key={key} class="bg-base-200 rounded-btn p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-base-content/50">{lbl}</span>
                      <button
                        className={`btn btn-xs ${copied === key ? 'btn-success' : 'btn-ghost'}`}
                        onClick={() => copy(key)}
                      >
                        <Copy className="w-3 h-3" /> {copied === key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-base-content/80 overflow-x-auto whitespace-pre-wrap break-all">
                      <code>{snippets[key]}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
