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

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export default function ColorInput({ id, label, value, onChange, placeholder }: Props) {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">{label}</legend>
      <div className="join w-full">
        <span className="join-item bg-base-200 px-3 flex items-center text-sm font-mono ring-1 ring-inset ring-base-300">#</span>
        <input
          id={id}
          type="text"
          className="input join-item w-full font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
          placeholder={placeholder}
          maxLength={6}
        />
        <div className="dropdown dropdown-end join-item">
          <div
            tabIndex={0}
            role="button"
            className="w-10 h-full cursor-pointer rounded-r-box ring-1 ring-inset ring-base-300"
            style={{ backgroundColor: value ? `#${value}` : '#ccc' }}
          />
          <div tabIndex={0} className="dropdown-content z-30 mt-1 p-2 shadow bg-base-100 rounded-box border border-base-300 w-48">
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
              <span className="w-6 h-6 rounded-full border-2 border-dashed border-base-300 flex items-center justify-center text-[10px]">+</span>
              <span>Custom</span>
              <input
                type="color"
                className="absolute opacity-0 w-0 h-0"
                value={`#${value || '000000'}`}
                onChange={(e) => onChange(e.target.value.replace('#', ''))}
              />
            </label>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
