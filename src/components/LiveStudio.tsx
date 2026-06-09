import {
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileCode,
  FileText,
  Link,
  RefreshCw,
  Save,
  Info,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { copyToClipboard } from '../lib/dom';
import { COPY_FORMATS, getSnippet, type CopyFormatKey } from '../lib/formats';
import { loadIcons, searchIcons, type SimpleIconData } from '../lib/icons';
import type { UserCategory } from '../lib/storage';
import {
  buildShieldsUrl,
  clearIconCache,
  createCategory,
  getAllCategories,
  getIconCacheCount,
  getIconPreviewPref,
  getIconSvg,
  isDuplicate,
  readClipboard,
  saveBadge,
  seedDefaultCategories,
  setIconPreviewPref,
} from '../lib/storage';

interface BadgeParams {
  label: string;
  message: string;
  color: string;
  logo: string;
  logoColor: string;
  logoSize: string;
  style: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  labelColor: string;
}

const STYLES: BadgeParams['style'][] = [
  'flat',
  'flat-square',
  'plastic',
  'for-the-badge',
  'social',
];

interface LiveStudioProps {
  initialParams?: Partial<BadgeParams>;
}

/** Parses runtime badge params from clipboard or URL query. Returns params and optional category info. */
// Complex param extraction from clipboard + URL, inherently branches on many fields.
// fallow-ignore-next-line complexity
function resolveRuntimeParams(): {
  params: Partial<BadgeParams>;
  categorySlug?: string;
  categoryId?: number;
} {
  if (typeof window === 'undefined') return { params: {} };

  const clipboard = readClipboard();
  if (clipboard) {
    const r: Partial<BadgeParams> = {};
    if ('label' in clipboard) r.label = clipboard.label;
    if ('message' in clipboard) r.message = clipboard.message;
    if ('color' in clipboard) r.color = clipboard.color;
    if ('logo' in clipboard) r.logo = clipboard.logo;
    if ('logoColor' in clipboard) r.logoColor = clipboard.logoColor;
    if ('logoSize' in clipboard) r.logoSize = clipboard.logoSize;
    if (clipboard.style && STYLES.includes(clipboard.style)) r.style = clipboard.style;
    if ('labelColor' in clipboard) r.labelColor = clipboard.labelColor;
    return {
      params: r,
      categorySlug: clipboard.categorySlug,
      categoryId: clipboard.categoryId,
    };
  }

  const sp = new URLSearchParams(window.location.search);
  if (['label', 'message', 'color'].some((k) => sp.has(k))) {
    const r: Partial<BadgeParams> = {};
    const v = (k: string) => sp.get(k) || undefined;
    const l = v('label');
    if (l) r.label = l;
    const m = v('message');
    if (m) r.message = m;
    const c = v('color');
    if (c) r.color = c;
    const lo = v('logo');
    if (lo) r.logo = lo;
    const lc = v('logoColor');
    if (lc) r.logoColor = lc;
    const ls = v('logoSize');
    if (ls) r.logoSize = ls;
    const st = v('style') as BadgeParams['style'] | null;
    if (st && STYLES.includes(st)) r.style = st;
    const lb = v('labelColor');
    if (lb) r.labelColor = lb;
    return { params: r };
  }

  return { params: {} };
}

// Large React component (650 loc) with extensive live-preview state; decomposition tracked in backlog.
// fallow-ignore-next-line complexity
export default function LiveStudio({ initialParams }: LiveStudioProps) {
  const [params, setParams] = useState<BadgeParams>({
    label: initialParams?.label ?? 'Label',
    message: initialParams?.message ?? 'Message',
    color: initialParams?.color ?? '6366f1',
    logo: initialParams?.logo ?? '',
    logoColor: initialParams?.logoColor ?? 'ffffff',
    logoSize: initialParams?.logoSize ?? '',
    style: initialParams?.style ?? 'flat',
    labelColor: initialParams?.labelColor ?? '',
  });

  const [altCustom, setAltCustom] = useState<string | null>(null);
  const [altEditing, setAltEditing] = useState(false);
  const effectiveAlt = altCustom ?? params.message;
  const [logoQuery, setLogoQuery] = useState(initialParams?.logo ?? '');
  const [logoTitle, setLogoTitle] = useState<string | null>(null);
  const [logoResults, setLogoResults] = useState<SimpleIconData[]>([]);

  const [showLogoDropdown, setShowLogoDropdown] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [iconPreviewEnabled, setIconPreviewEnabled] = useState(false);
  const [showIconOptIn, setShowIconOptIn] = useState(false);
  const [iconCacheCount, setIconCacheCount] = useState(0);
  const [refreshingIcons, setRefreshingIcons] = useState(false);

  // Category state
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const selectedCategoryRef = useRef<number | undefined>(undefined);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  const allIconsRef = useRef<SimpleIconData[]>([]);
  const logoSearchRef = useRef<HTMLFieldSetElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconsLoadingRef = useRef(false);

  useEffect(() => {
    setIconPreviewEnabled(getIconPreviewPref());
    getIconCacheCount().then(setIconCacheCount);
    seedDefaultCategories().then(() =>
      getAllCategories().then((cats) => {
        setCategories(cats);
        setCategoriesReady(true);
        // Resolve pending category slug from clipboard
        if (pendingCategorySlug.current) {
          const match = cats.find((c) => c.slug === pendingCategorySlug.current);
          if (match) {
            setSelectedCategoryId(match.id);
            selectedCategoryRef.current = match.id;
          }
          pendingCategorySlug.current = undefined;
        }
      }),
    );
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
  const pendingCategorySlug = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (didReadRuntime.current) return;
    didReadRuntime.current = true;
    const { params, categorySlug, categoryId } = resolveRuntimeParams();
    if (Object.keys(params).length > 0) {
      setParams((prev) => ({ ...prev, ...params }));
      if (params.logo) {
        setLogoQuery(params.logo);
        // Resolve human-readable title asynchronously
        loadIcons().then((icons) => {
          const match = icons.find(
            (icon) =>
              icon.slug === params.logo || icon.title.toLowerCase() === params.logo?.toLowerCase(),
          );
          if (match) {
            setLogoTitle(match.title);
            setLogoQuery(match.title);
          }
        });
      }
    }
    if (categoryId !== undefined) {
      // Direct category ID from clipboard (e.g., editing a saved badge)
      setSelectedCategoryId(categoryId);
      selectedCategoryRef.current = categoryId;
    } else if (categorySlug) {
      // Gallery slug — resolve after categories load
      pendingCategorySlug.current = categorySlug;
    }
  }, []);

  const ensureIconsLoaded = useCallback(async () => {
    if (allIconsRef.current.length > 0 || iconsLoadingRef.current) return;
    iconsLoadingRef.current = true;
    try {
      allIconsRef.current = await loadIcons();
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
        setLogoTitle(null);
        setParams((prev) => ({ ...prev, logo: '', logoSize: '' }));
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
    setLogoTitle(icon.title);
    setShowLogoDropdown(false);
  }, []);

  const updateParam = useCallback(<K extends keyof BadgeParams>(key: K, value: BadgeParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const shieldsUrl = useMemo(() => buildShieldsUrl(params), [params]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'duplicate'>('idle');

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const dup = await isDuplicate({
        ...params,
        categoryId: selectedCategoryRef.current,
      });
      if (dup) {
        setSaveStatus('duplicate');
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
        return;
      }
      await saveBadge({
        ...params,
        name: `${params.label}-${params.message}`,
        categoryId: selectedCategoryRef.current,
      });
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('idle');
    }
  }, [params]);

  const handleCreateCategory = useCallback(async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const id = await createCategory(trimmed, undefined, newCategoryDescription.trim() || undefined);
    setCategories(await getAllCategories());
    setSelectedCategoryId(id);
    selectedCategoryRef.current = id;
    setShowCategoryModal(false);
    setNewCategoryName('');
    setNewCategoryDescription('');
  }, [newCategoryName, newCategoryDescription]);

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
            disabled={saveStatus === 'saving' || saveStatus === 'duplicate' || !categoriesReady}
          >
            {saveStatus === 'duplicate' ? (
              'Already saved!'
            ) : saveStatus === 'saved' ? (
              '✓ Saved!'
            ) : saveStatus === 'saving' ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveStatus === 'idle' && 'Save'}
          </button>
        </div>

        {/* ── Label + Message ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Label</legend>
            <input
              id="badge-label"
              name="label"
              type="text"
              className="input input-bordered w-full"
              value={params.label}
              onChange={(e) => updateParam('label', e.target.value)}
              placeholder="build"
            />
            <p className="fieldset-label">Left side text — leave blank for message-only</p>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Message <span className="text-error text-xs">*</span>
            </legend>
            <input
              id="badge-message"
              name="message"
              type="text"
              className="input input-bordered w-full"
              value={params.message}
              onChange={(e) => updateParam('message', e.target.value)}
              placeholder="passing"
              required
            />
            <p className="fieldset-label">Right side text — the main badge content</p>
          </fieldset>
        </div>

        {/* ── Label Color + Message Color ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <ColorInput
            id="label-color"
            label="Label Color"
            value={params.labelColor}
            onChange={(v) => updateParam('labelColor', v)}
            placeholder="Hex color"
            hint="Background color for the label (left) side — leave blank for default"
          />
          <ColorInput
            id="badge-color"
            label="Message Color"
            value={params.color}
            onChange={(v) => updateParam('color', v)}
            placeholder="Hex color"
            required
            hint="Required — background color for the message (right) side"
          />
        </div>

        {/* ── Logo Search + Logo Color ──────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <fieldset className="fieldset relative" ref={logoSearchRef}>
            <legend className="fieldset-legend">Logo / Icon</legend>

            {showIconOptIn && (
              <div className="alert alert-soft mb-2 text-sm">
                <Info className="w-4 h-4" />
                <span>Show brand icon previews? SVGs are cached locally.</span>
                <div className="flex gap-1">
                  <button className="btn btn-xs btn-primary" onClick={handleEnablePreviews}>
                    Yes
                  </button>
                  <button className="btn btn-xs btn-ghost" onClick={handleDisablePreviews}>
                    No
                  </button>
                </div>
              </div>
            )}

            <input
              id="badge-logo"
              name="logo"
              type="text"
              className="input input-bordered w-full"
              value={logoQuery}
              onChange={(e) => handleLogoSearch(e.target.value)}
              onFocus={() => {
                ensureIconsLoaded();
                if (logoResults.length > 0) setShowLogoDropdown(true);
                if (localStorage.getItem('badgeforge-icon-previews') === null)
                  setShowIconOptIn(true);
              }}
              placeholder="Type to search icons…"
              autoComplete="off"
            />
            {params.logo && !showLogoDropdown && (
              <p className="text-xs text-success mt-1 font-medium">
                Selected: {logoTitle ?? params.logo}
              </p>
            )}
            {showLogoDropdown && (
              <ul className="absolute top-full mt-1 z-30 w-full bg-base-100 border border-base-300 rounded-box shadow-lg max-h-56 overflow-y-auto">
                {logoResults.map((icon) => (
                  <li key={icon.slug}>
                    <button
                      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-base-200 transition-colors"
                      onClick={() => selectLogo(icon)}
                    >
                      {iconPreviewEnabled ? (
                        <IconPreview slug={icon.slug} hex={icon.hex} />
                      ) : (
                        <span
                          className="w-5 h-5 rounded shrink-0 ring-1 ring-base-300 ring-inset"
                          style={{ backgroundColor: `#${icon.hex}` }}
                        />
                      )}
                      <span className="font-medium text-sm truncate">{icon.title}</span>
                      <span className="text-xs text-base-content/40 ml-auto font-mono shrink-0">
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
            <div className="fieldset-label flex items-center justify-between">
              <span>Find a brand icon — auto-applies its official color</span>
              {iconPreviewEnabled && (
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="text-base-content/40">
                    {iconCacheCount > 0 ? `${iconCacheCount} cached` : ''}
                  </span>
                  <button
                    className="btn btn-xs btn-ghost text-base-content/40"
                    onClick={handleRefreshIcons}
                    disabled={refreshingIcons}
                    title="Refresh icon cache"
                  >
                    {refreshingIcons ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </button>
                </span>
              )}
            </div>
          </fieldset>

          <ColorInput
            id="logo-color"
            label="Logo Color"
            value={params.logoColor}
            onChange={(v) => updateParam('logoColor', v)}
            placeholder="Hex color"
            hint="Color of the icon — defaults to white if blank"
          />
        </div>

        {/* Logo size toggle (for wider logos) */}
        {params.logo && (
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={params.logoSize === 'auto'}
              onChange={(e) => updateParam('logoSize', e.target.checked ? 'auto' : '')}
            />
            <span>Auto-size logo</span>
            <span className="text-base-content/40 text-xs">
              — enables adaptive resizing for wider brand icons
            </span>
          </label>
        )}

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
          <p className="fieldset-label">Controls the badge shape — flat, rounded, or bold</p>
        </fieldset>

        {/* ── Category ──────────────────────────────── */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Category</legend>
          <div className="flex gap-2">
            <select
              className="select select-bordered w-full"
              value={selectedCategoryId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                const id = val ? Number(val) : undefined;
                setSelectedCategoryId(id);
                selectedCategoryRef.current = id;
              }}
            >
              <option value="">Uncategorized</option>
              {(() => {
                const userCats = categories.filter((c) => !c.readonly);
                const builtinCats = categories.filter((c) => c.readonly);
                return (
                  <>
                    {userCats.length > 0 && (
                      <optgroup label="Your Categories">
                        {userCats.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {builtinCats.length > 0 && (
                      <optgroup label="Gallery Categories">
                        {builtinCats.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                );
              })()}
            </select>
            <button
              className="btn btn-outline btn-square shrink-0"
              onClick={() => setShowCategoryModal(true)}
              title="Create new category"
            >
              +
            </button>
          </div>
          <p className="fieldset-label">
            Organize badges into groups — leave as Uncategorized if unsure
          </p>
        </fieldset>

        {/* ── Create Category Modal ─────────────────── */}
        <dialog className={`modal ${showCategoryModal ? 'modal-open' : ''}`}>
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">New Category</h3>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Name</legend>
              <input
                type="text"
                className="input input-bordered w-full"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. CI/CD, Social, Monitoring"
                autoFocus
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Description (optional)</legend>
              <textarea
                className="textarea textarea-bordered w-full"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="What kind of badges belong here?"
                rows={2}
              />
            </fieldset>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
              >
                Create
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCategoryModal(false)}>close</button>
          </form>
        </dialog>
      </div>

      {/* ── RIGHT: Preview ─────────────────────────────── */}
      <div className="lg:w-1/2 lg:sticky lg:top-24 lg:self-start space-y-5 min-w-0 overflow-hidden">
        <button
          className="lg:hidden btn btn-outline btn-sm w-full"
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
        >
          {mobilePreviewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>

        <div className={mobilePreviewOpen ? 'block space-y-5' : 'hidden lg:block lg:space-y-5'}>
          {/* Magnified */}
          <div className="card glass-card relative">
            <div className="card-body p-3 sm:p-4 flex items-center justify-center min-h-24">
              <span className="absolute top-2 left-3 text-[10px] opacity-40 uppercase tracking-wider font-medium select-none pointer-events-none">
                Magnified View
              </span>
              <img
                src={shieldsUrl}
                alt="Badge preview (magnified)"
                className="scale-[2.5]"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>

          {/* Actual size */}
          <div className="card glass-card relative">
            <div className="card-body p-3 sm:p-4 flex items-center justify-center min-h-16">
              <span className="absolute top-2 left-3 text-[10px] opacity-40 uppercase tracking-wider font-medium select-none pointer-events-none">
                Actual Size
              </span>
              <img src={shieldsUrl} alt="Badge preview (actual size)" />
            </div>
          </div>

          {/* Alt Text */}
          <div className="card glass-card">
            <div className="card-body p-3 sm:p-4 gap-2">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-xs sm:text-sm opacity-70 font-medium uppercase tracking-wider">
                  Alt Text
                </h3>
                <div className="flex gap-1">
                  {altCustom !== null && (
                    <button
                      className="btn btn-xs btn-ghost text-base-content/40"
                      onClick={() => {
                        setAltCustom(null);
                        setAltEditing(false);
                      }}
                      title="Reset to message text"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => {
                      if (altEditing) setAltEditing(false);
                      else {
                        setAltCustom(effectiveAlt);
                        setAltEditing(true);
                      }
                    }}
                    title={altEditing ? 'Done editing' : 'Edit alt text'}
                  >
                    {altEditing ? 'Done' : 'Edit'}
                  </button>
                </div>
              </div>
              {altEditing ? (
                <input
                  id="badge-alt"
                  name="alt"
                  type="text"
                  className="input input-bordered input-sm w-full"
                  value={altCustom ?? ''}
                  onChange={(e) => setAltCustom(e.target.value)}
                  placeholder={params.message || 'Message'}
                  autoFocus
                />
              ) : (
                <div className="input input-bordered input-sm w-full flex items-center text-sm opacity-60 cursor-default select-none">
                  {effectiveAlt}
                </div>
              )}
              <p className="text-[11px] text-base-content/50">
                {altCustom !== null
                  ? 'Custom alt text — click Reset to track the message automatically'
                  : 'Tracks the message text automatically — click Edit to customize'}
              </p>
            </div>
          </div>

          <CopyTabs shieldsUrl={shieldsUrl} alt={effectiveAlt || undefined} />
        </div>

        {!mobilePreviewOpen && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
            <button
              className="btn btn-primary w-full shadow-xl"
              onClick={() => setMobilePreviewOpen(true)}
            >
              Preview Badge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ColorInput (inline) ─────────────────────────── */
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

function ColorInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">
        {label}
        {required && <span className="text-error text-xs"> *</span>}
      </legend>
      <div className="join w-full">
        <span className="join-item bg-base-200 px-3 flex items-center text-sm font-mono ring-1 ring-inset ring-base-300">
          #
        </span>
        <input
          id={id}
          name={id}
          type="text"
          className="input join-item w-full font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
          placeholder={placeholder}
        />
        <div className="dropdown dropdown-end join-item">
          <div
            tabIndex={0}
            role="button"
            className={`tooltip w-10 h-full cursor-pointer rounded-r-box ring-1 ring-inset ring-base-300 flex items-center justify-center hover:ring-2 hover:ring-base-content/30 transition-all ${value ? '' : 'bg-base-100'}`}
            style={
              value
                ? { backgroundColor: `#${value}` }
                : {
                    backgroundImage:
                      'linear-gradient(135deg, transparent 47%, var(--color-base-300) 47%, var(--color-base-300) 53%, transparent 53%)',
                  }
            }
            data-tip="Pick a color"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${value ? 'text-white' : 'text-base-content/30'}`}
            />
          </div>
          <div
            tabIndex={0}
            className="dropdown-content z-30 mt-1 p-2 shadow bg-base-100 rounded-box border border-base-300 w-48"
          >
            <p className="px-1 py-1 text-xs text-base-content/50 font-medium">Palette</p>
            <div className="flex flex-wrap gap-1.5 px-1 py-1">
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${value === c.hex ? 'border-base-content' : 'border-base-300'}`}
                  style={{ backgroundColor: `#${c.hex}` }}
                  onClick={() => onChange(c.hex)}
                  title={c.label}
                />
              ))}
            </div>
            <div className="divider my-1" />
            <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-base-200 rounded text-sm">
              <span className="w-6 h-6 rounded-full border-2 border-dashed border-base-300 flex items-center justify-center text-[10px]">
                +
              </span>
              <span>Custom</span>
              <input
                id={`${id}-picker`}
                name={`${id}-picker`}
                type="color"
                className="absolute opacity-0 w-0 h-0"
                value={`#${value || '000000'}`}
                onChange={(e) => onChange(e.target.value.replace('#', ''))}
              />
            </label>
          </div>
        </div>
      </div>
      {hint && <p className="fieldset-label">{hint}</p>}
    </fieldset>
  );
}

/* ── IconPreview (inline) ────────────────────────── */
function IconPreview({ slug, hex }: { slug: string; hex: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    setSvg(null);
    setError(false);
    getIconSvg(slug)
      .then((d) => {
        if (mountedRef.current) setSvg(d);
      })
      .catch(() => {
        if (mountedRef.current) setError(true);
      });
    return () => {
      mountedRef.current = false;
    };
  }, [slug]);
  if (error)
    return (
      <span
        className="w-5 h-5 rounded shrink-0 ring-1 ring-base-300 ring-inset"
        style={{ backgroundColor: `#${hex}` }}
      />
    );
  if (!svg)
    return (
      <span
        className="w-5 h-5 rounded shrink-0 animate-pulse"
        style={{ backgroundColor: `${hex}40` }}
      />
    );
  return (
    <span
      className="w-5 h-5 shrink-0 inline-flex items-center justify-center"
      dangerouslySetInnerHTML={{
        __html: svg.replace(/width="[^"]*"/, 'width="20"').replace(/height="[^"]*"/, 'height="20"'),
      }}
    />
  );
}

/* ── CopyTabs (inline) ───────────────────────────── */
const TAB_ICONS: Record<CopyFormatKey, typeof FileCode> = {
  url: Link,
  md: FileCode,
  rst: FileText,
  asciidoc: BookOpen,
  html: Code2,
};

function CopyTabs({ shieldsUrl, alt }: { shieldsUrl: string; alt?: string | undefined }) {
  const [tab, setTab] = useState<CopyFormatKey>('md');
  const [copied, setCopied] = useState(false);
  const snippets = useMemo(() => {
    const result: Record<string, string> = {};
    for (const { key } of COPY_FORMATS) {
      result[key] = getSnippet(key, shieldsUrl, alt);
    }
    return result;
  }, [shieldsUrl, alt]);
  const snippet = snippets[tab] ?? '';

  const copy = useCallback(async () => {
    await copyToClipboard(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet]);

  return (
    <div className="card glass-card">
      <div className="card-body p-3 sm:p-4 gap-3">
        {/* Title — matches other right-side cards */}
        <h3 className="card-title text-xs sm:text-sm opacity-70 font-medium uppercase tracking-wider">
          <Code2 className="w-4 h-4" /> Embed code
        </h3>

        {/* Format selector */}
        <div className="join">
          {COPY_FORMATS.map(({ key, label }) => {
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                className={`join-item btn btn-xs gap-1 ${tab === key ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setTab(key)}
                title={label}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Code block with floating copy button */}
        <div className="bg-base-100 border border-base-300/50 rounded-box overflow-hidden relative group/code">
          <pre className="text-xs font-mono text-base-content/80 whitespace-pre-wrap break-all min-h-18 m-0 p-4 pr-20">
            <code>{snippet}</code>
          </pre>
          <button
            className={`btn btn-xs gap-1 absolute top-2 right-2 shadow-sm transition-all ${copied ? 'btn-success' : 'btn-ghost opacity-60 group-hover/code:opacity-100'}`}
            onClick={copy}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
