import { AURA_THEMES } from "./aura/auraThemes";
import { AMBIENT_STYLE_OPTIONS, type AmbientStyleId, type ProductId } from "./ambientPresets";

export type AmbientStylePickerProps = {
  product: ProductId;
  value: AmbientStyleId;
  onChange: (next: AmbientStyleId) => void;
  className?: string;
};

export function AmbientStylePicker({ product: _product, value, onChange, className = "" }: AmbientStylePickerProps) {
  return (
    <div className={`ceg-ambient-picker ${className}`.trim()} role="listbox" aria-label="Ambient background style">
      {AMBIENT_STYLE_OPTIONS.map((opt) => {
        const aura = opt.group === "aura" ? AURA_THEMES[opt.id as keyof typeof AURA_THEMES] : null;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`ceg-ambient-picker__btn${active ? " is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {aura ? (
              <span
                className="ceg-ambient-picker__swatch"
                style={{ background: aura.layers[0] ?? aura.base }}
                aria-hidden
              />
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
