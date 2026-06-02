import { useState, useEffect, useRef } from 'react';
import { getIconSvg } from '../lib/storage';

/** Lazy-loads a single icon SVG from Dexie cache or CDN. Shows a colored placeholder while loading. */
export default function IconPreview({ slug, hex }: { slug: string; hex: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setSvg(null);
    setError(false);

    getIconSvg(slug)
      .then((data) => {
        if (mountedRef.current) setSvg(data);
      })
      .catch(() => {
        if (mountedRef.current) setError(true);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [slug]);

  if (error) {
    return (
      <span
        className="w-5 h-5 rounded shrink-0 ring-1 ring-base-300 ring-inset"
        style={{ backgroundColor: `#${hex}` }}
        title={`Brand color: #${hex}`}
      />
    );
  }

  if (!svg) {
    return (
      <span
        className="w-5 h-5 rounded shrink-0 animate-pulse"
        style={{ backgroundColor: `#${hex}40` }}
      />
    );
  }

  return (
    <span
      className="w-5 h-5 shrink-0 inline-flex items-center justify-center"
      dangerouslySetInnerHTML={{
        __html: svg
          .replace(/width="[^"]*"/, 'width="20"')
          .replace(/height="[^"]*"/, 'height="20"'),
      }}
    />
  );
}
