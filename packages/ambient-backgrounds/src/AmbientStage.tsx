import type { CSSProperties, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { AmbientBackgroundRenderer } from "./AmbientBackgroundRenderer";
import { readAmbientPreference, subscribeAmbientPreference } from "./ambientPreference";
import type { AmbientStyleId, AmbientSurface, ProductId } from "./ambientPresets";

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useStoredAmbientStyle(product: ProductId, override?: AmbientStyleId): AmbientStyleId {
  const stored = useSyncExternalStore(
    subscribeAmbientPreference,
    () => readAmbientPreference(product),
    () => "auto" as AmbientStyleId,
  );
  return override ?? stored;
}

export type AmbientStageProps = {
  product: ProductId;
  surface: AmbientSurface;
  isDark: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ambientStyle?: AmbientStyleId;
};

/** Full-bleed ambient canvas + veil + centred content (auth pages). */
export function AmbientStage({
  product,
  surface,
  isDark,
  children,
  className = "",
  style,
  ambientStyle,
}: AmbientStageProps) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const stored = useStoredAmbientStyle(product, ambientStyle);

  return (
    <div className={`ceg-ambient-stage ${className}`.trim()} style={style}>
      <div className="ceg-ambient-stage__canvas">
        <AmbientBackgroundRenderer
          product={product}
          surface={surface}
          isDark={isDark}
          style={stored}
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="ceg-ambient-stage__veil" aria-hidden />
      <div className="ceg-ambient-stage__content">{children}</div>
    </div>
  );
}

export type AmbientFillProps = {
  product: ProductId;
  surface: AmbientSurface;
  isDark: boolean;
  className?: string;
  style?: CSSProperties;
  ambientStyle?: AmbientStyleId;
};

/** Absolute inset-0 layer for heroes / marketing sections. Parent must be `position: relative`. */
export function AmbientFill({ product, surface, isDark, className = "", style, ambientStyle }: AmbientFillProps) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const stored = useStoredAmbientStyle(product, ambientStyle);

  return (
    <div className={`ceg-ambient-fill ${className}`.trim()} style={{ position: "absolute", inset: 0, ...style }} aria-hidden>
      <div className="ceg-ambient-fill__canvas">
        <AmbientBackgroundRenderer
          product={product}
          surface={surface}
          isDark={isDark}
          style={stored}
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="ceg-ambient-fill__veil" />
    </div>
  );
}
