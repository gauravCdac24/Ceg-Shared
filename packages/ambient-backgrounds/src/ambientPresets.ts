import type { AuraThemeId } from "./aura/auraThemes";

export type ProductId = "fetchdesk" | "workshopos";
export type AmbientSurface = "auth" | "landing";
export type AmbientEngine = "aura" | "waves" | "lightfall" | "topography" | "ballpit";

export type AmbientStyleId = "auto" | AmbientEngine | AuraThemeId;

export type AmbientResolvedConfig = {
  engine: AmbientEngine;
  auraThemeId?: AuraThemeId;
  /** When true, skip WebGL / heavy canvas (auth safety on WorkshopOS). */
  lightweightOnly?: boolean;
};

const AURA_IDS = new Set<AuraThemeId>([
  "aurora-nova",
  "arctic-frost",
  "midnight-horizon",
  "nightfall",
  "phantom-arc",
  "glacier-mist",
  "champagne-fizz",
  "neon-skyline",
  "ember-glow",
  "deep-lagoon",
]);

export function isAuraThemeId(value: string): value is AuraThemeId {
  return AURA_IDS.has(value as AuraThemeId);
}

export function isAmbientEngine(value: string): value is AmbientEngine {
  return value === "aura" || value === "waves" || value === "lightfall" || value === "topography" || value === "ballpit";
}

const WEBGL_ENGINES = new Set<AmbientEngine>(["lightfall", "topography", "ballpit"]);

export function resolveAmbientConfig(
  product: ProductId,
  surface: AmbientSurface,
  isDark: boolean,
  style: AmbientStyleId = "auto",
): AmbientResolvedConfig {
  const noWebgl = product === "workshopos" && surface === "auth";

  if (style !== "auto") {
    if (isAuraThemeId(style)) return { engine: "aura", auraThemeId: style, lightweightOnly: noWebgl };
    if (isAmbientEngine(style)) {
      if (noWebgl && WEBGL_ENGINES.has(style)) {
        return {
          engine: "aura",
          auraThemeId: isDark ? "phantom-arc" : "glacier-mist",
          lightweightOnly: true,
        };
      }
      return { engine: style, lightweightOnly: noWebgl };
    }
  }

  if (product === "fetchdesk") {
    if (surface === "auth") {
      return isDark ? { engine: "lightfall" } : { engine: "waves" };
    }
    return isDark
      ? { engine: "topography", auraThemeId: "midnight-horizon" }
      : { engine: "ballpit", auraThemeId: "arctic-frost" };
  }

  if (surface === "auth") {
    return isDark
      ? { engine: "aura", auraThemeId: "phantom-arc", lightweightOnly: true }
      : { engine: "waves", auraThemeId: "glacier-mist", lightweightOnly: true };
  }

  return isDark
    ? { engine: "lightfall", auraThemeId: "neon-skyline" }
    : { engine: "ballpit", auraThemeId: "champagne-fizz" };
}

export const AMBIENT_STYLE_OPTIONS: { id: AmbientStyleId; label: string; group: "auto" | "engine" | "aura" }[] = [
  { id: "auto", label: "Auto (theme)", group: "auto" },
  { id: "waves", label: "Waves", group: "engine" },
  { id: "lightfall", label: "Lightfall", group: "engine" },
  { id: "topography", label: "Topography", group: "engine" },
  { id: "ballpit", label: "Ballpit", group: "engine" },
  { id: "aura", label: "Aura gradient", group: "engine" },
  { id: "aurora-nova", label: "Aurora Nova", group: "aura" },
  { id: "arctic-frost", label: "Arctic Frost", group: "aura" },
  { id: "midnight-horizon", label: "Midnight Horizon", group: "aura" },
  { id: "nightfall", label: "Nightfall", group: "aura" },
  { id: "phantom-arc", label: "Phantom Arc", group: "aura" },
  { id: "glacier-mist", label: "Glacier Mist", group: "aura" },
  { id: "champagne-fizz", label: "Champagne Fizz", group: "aura" },
  { id: "neon-skyline", label: "Neon Skyline", group: "aura" },
  { id: "ember-glow", label: "Ember Glow", group: "aura" },
  { id: "deep-lagoon", label: "Deep Lagoon", group: "aura" },
];
