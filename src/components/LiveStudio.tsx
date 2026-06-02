import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Save, RefreshCw } from 'lucide-react';
import { buildShieldsUrl, saveBadge, readClipboard, getIconPreviewPref, setIconPreviewPref, clearIconCache, getIconCacheCount } from '../lib/storage';
import IconPreview from './IconPreview';
import ColorInput from './ColorInput';
import CopyTabs from './CopyTabs';
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

interface LiveStudioProps {
  initialParams?: Partial<BadgeParams>;
}

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
    const l = v('label'); if (l) r.label = l;
    const m = v('message'); if (m) r.message = m;
    const c = v('color'); if (c) r.color = c;
    const lo = v('logo'); if (lo) r.logo = lo;
    const lc = v('logoColor'); if (lc) r.logoColor = lc;
    const st = v('style') as BadgeParams['style'] | null;
    if (st && STYLES.includes(st)) r.style = st;
    const lb = v('labelColor'); if (lb) r.labelColor = lb;
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
  const [iconPreviewEnabled, setIconPreviewEnabled] = useState(false);
  const [showIconOptIn, setShowIconOptIn] = useState(false);
  const [iconCacheCount, setIconCacheCount] = useState(0);
  const [refreshingIcons, setRefreshingIcons] = useState(false);

  const allIconsRef = useRef<SimpleIconData[]>([]);
  const logoSearchRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const iconsLoadingRef = useRef(false);

  useEffect(() => {
    setIconPreviewEnabled(getIconPreviewPref());
    getIconCacheCount().then(setIconCacheCount);
  }, []);

  const handleEnablePreviews = useCallback(() => {
    setIconPreviewPref(true);
    setIconPreviewEnabled(true);
    setShowIconOptIn(false);
  }, []);

  const handleDisablePreviews = useCallback(() => {
    setIconPreviewPref(false);
    setIconPreviewEnabled(false);
    setShowIconOptIn(false);
  }, []);

  const handleRefreshIcons = useCallback(async () => {
    setRefreshingIcons(true);
    await clearIconCache();
    setIconCacheCount(0);
    setRefreshingIcons(false);
  }, []);

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

  const selectLogo = useCallback((icon: SimpleIconData) => {
    setParams((prev) => ({ ...prev, logo: icon.slug, color: icon.hex.toLowerCase() }));
    setLogoQuery(icon.title);
    setShowLogoDropdown(false);
  }, []);

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
      <div className="lg:w-1/2 space-y-5 min-w-0">

        {/* Header + Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Configure Badge</h2>
            <p className="text-sm text-base-content/60">Tweak every detail in real time</p>
          </div>
          <button
            className="btn btn-primary btn-sm sm:btn-md"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saved'
              ? '✓ Saved!'
              : saveStatus === 'saving'
                ? <span className="loading loading-spinner loading-sm" />
                : <Save className="w-4 h-4" />
            }
            {saveStatus === 'idle' && 'Save'}
          </button>
        </div>

        {/* ── Label & Message ──────────────────────────── */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Label &amp; Message</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              className="input input-bordered w-full"
              value={params.label}
              onChange={(e) => updateParam('label', e.target.value)}
              placeholder="Label (left side)"
            />
            <input
              type="text"
              className="input input-bordered w-full"
              value={params.message}
              onChange={(e) => updateParam('message', e.target.value)}
              placeholder="Message (right side)"
            />
          </div>
        </fieldset>

        {/* ── Badge Color ──────────────────────────────── */}
        <ColorInput
          id="badge-color"
          label="Badge Color"
          value={params.color}
          onChange={(v) => updateParam('color', v)}
          placeholder="6366f1"
        />

        {/* ── Logo / Icon ──────────────────────────────── */}
        <fieldset className="fieldset relative" ref={logoSearchRef}>
          <legend className="fieldset-legend flex items-center gap-2">
            Logo / Icon
            {iconPreviewEnabled && (
              <span className="inline-flex items-center gap-1">
                <span className="text-xs text-base-content/40 font-normal">{iconCacheCount > 0 ? `${iconCacheCount} cached` : ''}</span>
                <button className="btn btn-xs btn-ghost text-base-content/40" onClick={handleRefreshIcons} disabled={refreshingIcons} title="Refresh icon cache">
                  {refreshingIcons
                    ? <span className="loading loading-spinner loading-xs" />
                    : <RefreshCw className="w-3 h-3" />
                  }
                </button>
              </span>
            )}
          </legend>

          {showIconOptIn && (
            <div className="alert alert-soft mb-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Show brand icon previews? SVGs are cached locally.</span>
              <div className="flex gap-1">
                <button className="btn btn-xs btn-primary" onClick={handleEnablePreviews}>Yes</button>
                <button className="btn btn-xs btn-ghost" onClick={handleDisablePreviews}>No</button>
              </div>
            </div>
          )}

          <input
            type="text"
            className="input input-bordered w-full"
            value={logoQuery}
            onChange={(e) => handleLogoSearch(e.target.value)}
            onFocus={() => {
              ensureIconsLoaded();
              if (logoResults.length > 0) setShowLogoDropdown(true);
              if (localStorage.getItem('badgecraft-icon-previews') === null) setShowIconOptIn(true);
            }}
            placeholder="Search for a brand or logo…"
            autoComplete="off"
          />
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
                    {iconPreviewEnabled
                      ? <IconPreview slug={icon.slug} hex={icon.hex} />
                      : <span className="w-5 h-5 rounded shrink-0 ring-1 ring-base-300 ring-inset" style={{ backgroundColor: `#${icon.hex}` }} title={`Brand color: #${icon.hex}`} />
                    }
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
            placeholder="ffffff"
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
      <div className="lg:w-1/2 lg:sticky lg:top-24 lg:self-start space-y-5 min-w-0 overflow-hidden">
        <button className="lg:hidden btn btn-outline btn-sm w-full" onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}>
          {mobilePreviewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>

        <div className={mobilePreviewOpen ? 'block space-y-5' : 'hidden lg:block lg:space-y-5'}>
          {/* Magnified */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-xs sm:text-sm opacity-70 font-medium uppercase tracking-wider">Magnified View</h3>
              <div className="flex items-center justify-center min-h-24 py-4">
                <img src={shieldsUrl} alt="Badge preview (magnified)" className="scale-[2.5]" style={{ imageRendering: 'auto' }} />
              </div>
            </div>
          </div>

          {/* Actual size */}
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-3 sm:p-4">
              <h3 className="card-title text-xs sm:text-sm opacity-70 font-medium uppercase tracking-wider">Actual Size</h3>
              <div className="flex items-center justify-center min-h-13">
                <img src={shieldsUrl} alt="Badge preview (actual size)" />
              </div>
            </div>
          </div>

          <CopyTabs shieldsUrl={shieldsUrl} />
        </div>

        {!mobilePreviewOpen && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
            <button className="btn btn-primary w-full shadow-xl" onClick={() => setMobilePreviewOpen(true)}>Preview Badge</button>
          </div>
        )}
      </div>
    </div>
  );
}

