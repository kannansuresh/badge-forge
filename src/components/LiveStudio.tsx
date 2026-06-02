import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { buildShieldsUrl, toMarkdown, toHtml, saveBadge, readClipboard } from '../lib/storage';
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

const PALETTE = [
  { hex: '6366f1', label: 'Primary' },
  { hex: '8b5cf6', label: 'Secondary' },
  { hex: '06b6d4', label: 'Accent' },
  { hex: '1f2937', label: 'Neutral' },
  { hex: '22c55e', label: 'Success' },
  { hex: 'f59e0b', label: 'Warning' },
  { hex: 'ef4444', label: 'Error' },
  { hex: '3b82f6', label: 'Info' },
];

interface LiveStudioProps {
  initialParams?: Partial<BadgeParams>;
}

/** Resolve params: sessionStorage clipboard → URL query params → empty */
function resolveRuntimeParams(): Partial<BadgeParams> {
  if (typeof window === 'undefined') return {};

  const clipboard = readClipboard();
  if (clipboard) {
    const r: Partial<BadgeParams> = {};
    if (clipboard.label) r.label = clipboard.label;
    if (clipboard.message) r.message = clipboard.message;
    if (clipboard.color) r.color = clipboard.color;
    if (clipboard.logo) r.logo = clipboard.logo;
    if (clipboard.logoColor) r.logoColor = clipboard.logoColor;
    if (clipboard.style && STYLES.includes(clipboard.style)) r.style = clipboard.style;
    if (clipboard.labelColor) r.labelColor = clipboard.labelColor;
    return r;
  }

  const sp = new URLSearchParams(window.location.search);
  if (['label', 'message', 'color'].some((k) => sp.has(k))) {
    const r: Partial<BadgeParams> = {};
    const v = (k: string) => sp.get(k) || undefined;
    const lbl = v('label'); if (lbl) r.label = lbl;
    const msg = v('message'); if (msg) r.message = msg;
    const col = v('color'); if (col) r.color = col;
    const log = v('logo'); if (log) r.logo = log;
    const lc = v('logoColor'); if (lc) r.logoColor = lc;
    const st = v('style') as BadgeParams['style'] | null;
    if (st && STYLES.includes(st)) r.style = st;
    const lbc = v('labelColor'); if (lbc) r.labelColor = lbc;
    return r;
  }

  return {};
}

export default function LiveStudio({ initialParams }: LiveStudioProps) {
  const [params, setParams] = useState<BadgeParams>({
    label: initialParams?.label || 'badge',
    message: initialParams?.message || 'craft',
    color: initialParams?.color || '6366f1',
    logo: initialParams?.logo || '',
    logoColor: initialParams?.logoColor || 'ffffff',
    style: initialParams?.style || 'flat',
    labelColor: initialParams?.labelColor || '',
  });

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

  // Apply runtime params post-hydration (survives React hydration + Strict Mode)
  const didReadRuntime = useRef(false);
  useLayoutEffect(() => {
    if (didReadRuntime.current) return;
    didReadRuntime.current = true;
    const runtime = resolveRuntimeParams();
    if (Object.keys(runtime).length > 0) {
      setParams((prev) => ({ ...prev, ...runtime }));
    }
  }, []);

  const ensureIconsLoaded = useCallback(async () => {
    if (allIconsRef.current.length > 0 || iconsLoadingRef.current) return;
    iconsLoadingRef.current = true;
    try {
      allIconsRef.current = await loadIcons();
      setIconsLoaded(true);
    } finally {
      iconsLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (logoSearchRef.current && !logoSearchRef.current.contains(e.target as Node)) {
        setShowLogoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      setParams((prev) => ({ ...prev, logo: icon.slug, color: icon.hex.toLowerCase() }));
      setLogoQuery(icon.title);
      setShowLogoDropdown(false);
    },
    [],
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
      await saveBadge({ ...params, name: `${params.label}-${params.message}` });
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('idle');
    }
  }, [params]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* ── LEFT: Form ────────────────────────────────── */}
      <div className="lg:w-1/2 space-y-6">

        {/* Header + Save */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Configure Badge</h2>
            <p className="text-sm text-base-content/60">Tweak every detail in real time</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saved' ? '✓ Saved!' :
             saveStatus === 'saving' ? (
               <span className="loading loading-spinner" />
             ) : (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
               </svg>
             )}
            {saveStatus === 'idle' && 'Save to Collection'}
          </button>
        </div>

        {/* ── Label & Message ──────────────────────────── */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Label &amp; Message</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="input input-bordered flex items-center gap-2">
              <span className="text-base-content/50 text-sm font-medium">Label</span>
              <input
                type="text"
                className="grow font-mono"
                value={params.label}
                onChange={(e) => updateParam('label', e.target.value)}
                placeholder="Frontend"
              />
            </label>
            <label className="input input-bordered flex items-center gap-2">
              <span className="text-base-content/50 text-sm font-medium">Message</span>
              <input
                type="text"
                className="grow font-mono"
                value={params.message}
                onChange={(e) => updateParam('message', e.target.value)}
                placeholder="React"
              />
            </label>
          </div>
        </fieldset>

        {/* ── Badge Color ──────────────────────────────── */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Badge Color</legend>
          <div className="flex flex-wrap items-center gap-1 mb-2">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${
                  params.color === c.hex ? 'border-base-content scale-110 ring-2 ring-offset-2 ring-primary' : 'border-base-300'
                }`}
                style={{ backgroundColor: `#${c.hex}` }}
                onClick={() => updateParam('color', c.hex)}
                title={c.label}
              />
            ))}
            <label
              className={`w-6 h-6 rounded-full border border-dashed cursor-pointer flex items-center justify-center transition-transform hover:scale-125 ${
                !PALETTE.some((c) => c.hex === params.color) ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`}
              title="Pick custom color"
            >
              <span className="text-[10px] leading-none">+</span>
              <input
                type="color"
                className="absolute opacity-0 w-0 h-0"
                value={`#${params.color || '000000'}`}
                onChange={(e) => updateParam('color', e.target.value.replace('#', ''))}
              />
            </label>
          </div>
          <div className="join">
            <span className="join-item bg-base-200 px-3 flex items-center text-sm font-mono">#</span>
            <input
              type="text"
              className="input join-item w-full font-mono"
              value={params.color}
              onChange={(e) => updateParam('color', e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
              placeholder="6366f1"
              maxLength={6}
            />
            <span
              className="join-item w-10 border border-base-300"
              style={{ backgroundColor: `#${params.color || 'ccc'}` }}
            />
          </div>
        </fieldset>

        {/* ── Logo / Icon ──────────────────────────────── */}
        <fieldset className="fieldset relative" ref={logoSearchRef}>
          <legend className="fieldset-legend">Logo / Icon</legend>
          <label className="input input-bordered flex items-center gap-2">
            <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="grow"
              value={logoQuery}
              onChange={(e) => handleLogoSearch(e.target.value)}
              onFocus={() => {
                ensureIconsLoaded();
                if (logoResults.length > 0) setShowLogoDropdown(true);
              }}
              placeholder="Search for a brand or logo…"
              autoComplete="off"
            />
          </label>
          {params.logo && !showLogoDropdown && (
            <p className="text-xs text-success mt-1 font-medium">Selected: {params.logo}</p>
          )}
          {showLogoDropdown && (
            <ul className="absolute top-full mt-1 z-30 w-full bg-base-100 border border-base-300 rounded-box shadow-lg max-h-56 overflow-y-auto">
              {logoResults.map((icon) => (
                <li key={icon.slug}>
                  <button
                    className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-base-200 transition-colors"
                    onClick={() => selectLogo(icon)}
                  >
                    <span
                      className="w-5 h-5 rounded shrink-0 ring-1 ring-base-300 ring-inset"
                      style={{ backgroundColor: `#${icon.hex}` }}
                      title={`Brand color: #${icon.hex}`}
                    />
                    <span className="font-medium text-sm truncate">{icon.title}</span>
                    <span className="text-xs text-base-content/40 ml-auto font-mono shrink-0">#{icon.hex}</span>
                  </button>
                </li>
              ))}
              {logoResults.length === 0 && (
                <li className="px-3 py-2 text-sm text-base-content/50">No icons found</li>
              )}
            </ul>
          )}
        </fieldset>

        {/* ── Logo Color + Label Color ──────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorInput
            id="logo-color"
            label="Logo Color"
            value={params.logoColor}
            onChange={(v) => updateParam('logoColor', v)}
            placeholder="white"
          />
          <ColorInput
            id="label-color"
            label="Label Color"
            value={params.labelColor}
            onChange={(v) => updateParam('labelColor', v)}
            placeholder="Optional"
          />
        </div>

        {/* ── Badge Style ──────────────────────────────── */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Badge Style</legend>
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
        </fieldset>
      </div>

      {/* ── RIGHT: Preview ─────────────────────────────── */}
      <div className="lg:w-1/2 lg:sticky lg:top-24 lg:self-start space-y-6">
        {/* Mobile toggle */}
        <button
          className="lg:hidden btn btn-outline btn-sm w-full"
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
        >
          {mobilePreviewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>

        <div className={mobilePreviewOpen ? 'block' : 'hidden lg:block space-y-6'}>
          {/* Magnified */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4">
              <h3 className="card-title text-sm opacity-70 font-medium uppercase tracking-wider">
                Magnified View
              </h3>
              <div className="flex items-center justify-center min-h-[100px] py-4">
                <img
                  src={shieldsUrl}
                  alt="Badge preview (magnified)"
                  className="scale-[2.5]"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>
          </div>

          {/* Actual size */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4">
              <h3 className="card-title text-sm opacity-70 font-medium uppercase tracking-wider">
                Actual Size
              </h3>
              <div className="flex items-center justify-center min-h-[52px]">
                <img src={shieldsUrl} alt="Badge preview (actual size)" />
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-4">
              <h3 className="card-title text-sm opacity-70 font-medium uppercase tracking-wider">
                Copy Code
              </h3>
              <div className="flex flex-wrap gap-2">
                <CopyBtn label="Markdown" content={toMarkdown(shieldsUrl)} />
                <CopyBtn label="HTML" content={toHtml(shieldsUrl)} />
                <CopyBtn label="URL" content={shieldsUrl} />
              </div>
            </div>
          </div>

          {/* Raw URL */}
          <div className="mockup-code text-xs break-all">
            <pre data-prefix="$"><code>{shieldsUrl}</code></pre>
          </div>
        </div>

        {/* Mobile floating preview button */}
        {!mobilePreviewOpen && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
            <button className="btn btn-primary w-full shadow-xl" onClick={() => setMobilePreviewOpen(true)}>
              Preview Badge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable color input (palette + picker + hex) ────── */
function ColorInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {PALETTE.map((c) => (
          <button
            key={`${id}-${c.hex}`}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${
              value === c.hex ? 'border-base-content scale-110 ring-2 ring-offset-2 ring-primary' : 'border-base-300'
            }`}
            style={{ backgroundColor: `#${c.hex}` }}
            onClick={() => onChange(c.hex)}
            title={c.label}
          />
        ))}
        <label
          className={`w-6 h-6 rounded-full border border-dashed cursor-pointer flex items-center justify-center transition-transform hover:scale-125 ${
            !PALETTE.some((c) => c.hex === value) ? 'ring-2 ring-offset-2 ring-primary' : ''
          }`}
          title="Pick custom color"
        >
          <span className="text-[10px] leading-none">+</span>
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
          className="input join-item w-full font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
          placeholder={placeholder}
          maxLength={6}
        />
        <span
          className="join-item w-10 border border-base-300"
          style={{ backgroundColor: `#${value || 'ccc'}` }}
        />
      </div>
    </fieldset>
  );
}

/* ── Copy-to-clipboard button ───────────────────────── */
function CopyBtn({ label, content }: { label: string; content: string }) {
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
    <button className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'}`} onClick={copy}>
      {copied ? '✓ Copied!' : label}
    </button>
  );
}
