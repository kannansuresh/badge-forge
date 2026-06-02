import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { buildShieldsUrl, toMarkdown, toHtml, saveBadge } from '../lib/storage';
import { loadIcons, searchIcons, type SimpleIconData } from '../lib/icons';

interface BadgeParams {
  label: string;
  message: string;
  color: string;
  logo: string;
  logoColor: string;
  style: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor: string;
}

const STYLES: BadgeParams['style'][] = ['flat', 'flat-square', 'plastic', 'for-the-badge', 'social'];

const DAISY_COLORS = [
  { name: 'Primary', hex: '6366f1' },
  { name: 'Secondary', hex: '8b5cf6' },
  { name: 'Accent', hex: '06b6d4' },
  { name: 'Neutral', hex: '1f2937' },
  { name: 'Success', hex: '22c55e' },
  { name: 'Warning', hex: 'f59e0b' },
  { name: 'Error', hex: 'ef4444' },
  { name: 'Info', hex: '3b82f6' },
];

interface LiveStudioProps {
  /** Pre-populate the builder from external navigation (e.g. gallery click) */
  initialParams?: Partial<BadgeParams>;
}

/** Parse badge params from URL query string at runtime (SSG-compatible) */
function parseQueryParams(): Partial<BadgeParams> {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<BadgeParams> = {};
  const label = sp.get('label');
  const message = sp.get('message');
  const color = sp.get('color');
  const logo = sp.get('logo');
  const logoColor = sp.get('logoColor');
  const style = sp.get('style') as BadgeParams['style'] | null;
  const labelColor = sp.get('labelColor');
  if (label) result.label = label;
  if (message) result.message = message;
  if (color) result.color = color;
  if (logo) result.logo = logo;
  if (logoColor) result.logoColor = logoColor;
  if (style && STYLES.includes(style)) result.style = style;
  if (labelColor) result.labelColor = labelColor;
  return result;
}

export default function LiveStudio({ initialParams }: LiveStudioProps) {
  // Merge build-time props with runtime query params (for gallery → builder navigation)
  const resolvedParams = useMemo(() => {
    const queryParams = parseQueryParams();
    return {
      label: 'badge',
      message: 'craft',
      color: '6366f1',
      logo: '',
      logoColor: 'white',
      style: 'flat' as BadgeParams['style'],
      labelColor: '',
      ...initialParams,
      ...queryParams,
    };
  }, [initialParams]);

  const [params, setParams] = useState<BadgeParams>(resolvedParams);

  const [logoQuery, setLogoQuery] = useState('');
  const [logoResults, setLogoResults] = useState<SimpleIconData[]>([]);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [showLogoDropdown, setShowLogoDropdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const allIconsRef = useRef<SimpleIconData[]>([]);
  const logoSearchRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const iconsLoadingRef = useRef(false);

  // Lazy-load icons on first interaction with the logo search
  const ensureIconsLoaded = useCallback(async () => {
    if (allIconsRef.current.length > 0) return;
    if (iconsLoadingRef.current) return;
    iconsLoadingRef.current = true;
    try {
      const icons = await loadIcons();
      allIconsRef.current = icons;
      setIconsLoaded(true);
    } finally {
      iconsLoadingRef.current = false;
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (logoSearchRef.current && !logoSearchRef.current.contains(e.target as Node)) {
        setShowLogoDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced logo search — lazy-loads icons on first use
  const handleLogoSearch = useCallback(
    async (value: string) => {
      setLogoQuery(value);
      if (value.trim().length === 0) {
        setLogoResults([]);
        setShowLogoDropdown(false);
        return;
      }
      await ensureIconsLoaded();
      const results = searchIcons(value, allIconsRef.current, 12);
      setLogoResults(results);
      setShowLogoDropdown(results.length > 0);
    },
    [ensureIconsLoaded],
  );

  const selectLogo = useCallback(
    (icon: SimpleIconData) => {
      const newParams = {
        ...params,
        logo: icon.slug,
        color: icon.hex.toLowerCase(),
      };
      setParams(newParams);
      setLogoQuery(icon.title);
      setShowLogoDropdown(false);
    },
    [params],
  );

  const updateParam = useCallback(
    <K extends keyof BadgeParams>(key: K, value: BadgeParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const shieldsUrl = useMemo(() => buildShieldsUrl(params), [params]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await saveBadge({
        ...params,
        name: `${params.label}-${params.message}`,
      });
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('idle');
    }
  }, [params]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-12rem)]">
      {/* ── LEFT PANE: Configuration Inputs ─────────────────── */}
      <div className="lg:w-1/2 p-4 lg:p-6 space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Configure Badge</h2>
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saved' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : saveStatus === 'saving' ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
            {saveStatus !== 'saving' && saveStatus !== 'saved' && 'Save to Collection'}
          </button>
        </div>

        {/* Label + Message */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label" htmlFor="badge-label">
              <span className="label-text font-semibold">Label</span>
              <span className="label-text-alt text-base-content/60">Left side text</span>
            </label>
            <input
              id="badge-label"
              type="text"
              className="input input-bordered w-full"
              value={params.label}
              onChange={(e) => updateParam('label', e.target.value)}
              placeholder="e.g., Frontend"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="badge-message">
              <span className="label-text font-semibold">Message</span>
              <span className="label-text-alt text-base-content/60">Right side text</span>
            </label>
            <input
              id="badge-message"
              type="text"
              className="input input-bordered w-full"
              value={params.message}
              onChange={(e) => updateParam('message', e.target.value)}
              placeholder="e.g., React"
            />
          </div>
        </div>

        {/* Badge Color */}
        <ColorFieldInput
          id="badge-color"
          label="Badge Color"
          subtitle="Hex without #"
          value={params.color}
          onChange={(v) => updateParam('color', v)}
          placeholder="6366f1"
        />

        {/* Logo Search */}
        <div className="form-control relative" ref={logoSearchRef}>
          <label className="label" htmlFor="logo-search">
            <span className="label-text font-semibold">Logo / Icon</span>
            <span className="label-text-alt text-base-content/60">
              {iconsLoaded ? `${allIconsRef.current.length.toLocaleString()} icons` : 'Loading icons…'}
            </span>
          </label>
          <input
            id="logo-search"
            type="text"
            className="input input-bordered w-full"
            value={logoQuery}
            onChange={(e) => handleLogoSearch(e.target.value)}
            onFocus={() => {
              ensureIconsLoaded();
              if (logoResults.length > 0) setShowLogoDropdown(true);
            }}
            placeholder="Search for a brand or logo…"
            autoComplete="off"
          />
          {params.logo && !showLogoDropdown && (
            <p className="text-xs text-success mt-1">Selected: {params.logo}</p>
          )}

          {/* Dropdown results */}
          {showLogoDropdown && (
            <ul className="absolute top-full mt-1 z-30 w-full bg-base-100 border border-base-300 rounded-box shadow-lg max-h-56 overflow-y-auto">
              {logoResults.map((icon) => (
                <li key={icon.slug}>
                  <button
                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-base-200 transition-colors"
                    onClick={() => selectLogo(icon)}
                  >
                    <span
                      className="w-6 h-6 flex-shrink-0 rounded"
                      style={{ backgroundColor: `#${icon.hex}` }}
                    />
                    <span className="font-medium text-sm truncate">{icon.title}</span>
                    <span className="text-xs text-base-content/50 ml-auto font-mono">
                      #{icon.hex}
                    </span>
                  </button>
                </li>
              ))}
              {logoResults.length === 0 && (
                <li className="px-3 py-2 text-sm text-base-content/50">No icons found</li>
              )}
            </ul>
          )}
        </div>

        {/* Logo Color + Label Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorFieldInput
            id="logo-color"
            label="Logo Color"
            value={params.logoColor}
            onChange={(v) => updateParam('logoColor', v)}
            placeholder="white"
          />
          <ColorFieldInput
            id="label-color"
            label="Label Color"
            subtitle="Optional left bg"
            value={params.labelColor}
            onChange={(v) => updateParam('labelColor', v)}
            placeholder="Optional"
          />
        </div>

        {/* Style Selector */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Badge Style</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${params.style === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateParam('style', s)}
              >
                {s.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANE: Dual Preview Canvas ──────────────────── */}
      <div className="lg:w-1/2 lg:sticky lg:top-20 lg:self-start p-4 lg:p-6 space-y-6 bg-base-200/50 lg:bg-transparent">
        {/* Mobile preview toggle */}
        <button
          className="lg:hidden btn btn-sm btn-outline w-full mb-2"
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
        >
          {mobilePreviewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>

        <div className={mobilePreviewOpen ? 'block' : 'hidden lg:block'}>
          {/* Magnified View */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
              Magnified View
            </h3>
            <div className="badge-preview-wrapper min-h-[100px] p-6">
              <img
                src={shieldsUrl}
                alt="Badge preview (magnified)"
                className="scale-[2.5] max-w-full"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>

          {/* Actual-Size View */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
              Actual Size
            </h3>
            <div className="badge-preview-wrapper min-h-[60px]">
              <img
                src={shieldsUrl}
                alt="Badge preview (actual size)"
                className="max-w-full"
              />
            </div>
          </div>

          {/* Copy Utilities */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
              Copy Code
            </h3>
            <div className="flex flex-wrap gap-2">
              <CopyButton label="Markdown" content={toMarkdown(shieldsUrl)} />
              <CopyButton label="HTML" content={toHtml(shieldsUrl)} />
              <CopyButton label="URL" content={shieldsUrl} />
            </div>
          </div>

          {/* Raw URL display */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wide">
              Raw URL
            </h3>
            <div className="mockup-code text-xs break-all">
              <pre><code>{shieldsUrl}</code></pre>
            </div>
          </div>
        </div>

        {/* Mobile: floating preview toggle in bottom drawer style */}
        {!mobilePreviewOpen && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
            <button
              className="btn btn-primary w-full shadow-xl"
              onClick={() => setMobilePreviewOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Badge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Color field with palette chips + native color picker + hex input + live preview swatch */
function ColorFieldInput({
  id,
  label,
  subtitle,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  subtitle?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="form-control">
      <label className="label" htmlFor={id}>
        <span className="label-text font-semibold">{label}</span>
        {subtitle && (
          <span className="label-text-alt text-base-content/60">{subtitle}</span>
        )}
      </label>

      {/* DaisyUI palette chips — compact, single row */}
      <div className="flex flex-wrap gap-1 mb-2">
        {DAISY_COLORS.map((c) => (
          <button
            key={`${id}-${c.hex}`}
            className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${
              value === c.hex
                ? 'border-base-content scale-110 ring-1 ring-offset-1 ring-primary'
                : 'border-base-300'
            }`}
            style={{ backgroundColor: `#${c.hex}` }}
            onClick={() => onChange(c.hex)}
            title={c.name}
            aria-label={`Set ${label.toLowerCase()} to ${c.name}`}
          />
        ))}
        {/* Native color picker */}
        <label
          className={`w-5 h-5 rounded-full border border-dashed cursor-pointer flex items-center justify-center transition-transform hover:scale-125 ${
            !DAISY_COLORS.some((c) => c.hex === value) ? 'ring-1 ring-offset-1 ring-primary' : ''
          }`}
          title="Pick a custom color"
        >
          <span className="text-[10px] leading-none select-none">+</span>
          <input
            type="color"
            className="absolute opacity-0 w-0 h-0"
            value={`#${value || '000000'}`}
            onChange={(e) => onChange(e.target.value.replace('#', ''))}
          />
        </label>
      </div>

      <div className="join">
        <span className="join-item bg-base-200 px-3 flex items-center text-sm font-mono">#</span>
        <input
          id={id}
          type="text"
          className="input input-bordered join-item w-full font-mono"
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6),
            )
          }
          placeholder={placeholder}
          maxLength={6}
        />
        <span
          className="join-item w-10 border border-base-300"
          style={{ backgroundColor: `#${value || 'ccc'}` }}
        />
      </div>
    </div>
  );
}

/** Small copy-to-clipboard button */
function CopyButton({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <button className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'} gap-1`} onClick={copy}>
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        label
      )}
    </button>
  );
}
