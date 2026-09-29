import type { CSSProperties } from "react";
import { auraForMood, type AuraThemeId } from "./auraThemes";

export type AuraGradientBackgroundProps = {
  isDark: boolean;
  themeId?: AuraThemeId;
  className?: string;
  style?: CSSProperties;
};

export function AuraGradientBackground({ isDark, themeId, className = "", style }: AuraGradientBackgroundProps) {
  const theme = auraForMood(isDark, themeId);
  return (
    <div
      className={`ceg-aura-gradient ${className}`.trim()}
      style={{
        backgroundColor: theme.base,
        backgroundImage: theme.layers.join(", "),
        ...style,
      }}
      data-aura-theme={theme.id}
      aria-hidden
    >
      {theme.grain ? <div className="ceg-aura-gradient__grain" style={{ opacity: theme.grain }} /> : null}
    </div>
  );
}
