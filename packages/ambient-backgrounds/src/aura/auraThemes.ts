/** Aura-inspired layered gradient presets (CSS blend-mode stacks). */

export type AuraThemeId =
  | "aurora-nova"
  | "arctic-frost"
  | "midnight-horizon"
  | "nightfall"
  | "phantom-arc"
  | "glacier-mist"
  | "champagne-fizz"
  | "neon-skyline"
  | "ember-glow"
  | "deep-lagoon";

export type AuraThemeMeta = {
  id: AuraThemeId;
  label: string;
  mood: "light" | "dark";
  /** Base page fill */
  base: string;
  /** Stacked radial / linear layers (rendered as multiple backgrounds) */
  layers: string[];
  /** Optional grain overlay opacity 0–1 */
  grain?: number;
  /** Glow tint for cards / chrome */
  glow: string;
};

export const AURA_THEMES: Record<AuraThemeId, AuraThemeMeta> = {
  "aurora-nova": {
    id: "aurora-nova",
    label: "Aurora Nova",
    mood: "dark",
    base: "#050816",
    layers: [
      "radial-gradient(120% 80% at 20% 0%, rgba(82, 39, 255, 0.55), transparent 55%)",
      "radial-gradient(90% 70% at 85% 15%, rgba(255, 159, 252, 0.35), transparent 50%)",
      "radial-gradient(70% 50% at 50% 100%, rgba(10, 41, 255, 0.45), transparent 60%)",
    ],
    grain: 0.06,
    glow: "rgba(166, 200, 255, 0.22)",
  },
  "arctic-frost": {
    id: "arctic-frost",
    label: "Arctic Frost",
    mood: "light",
    base: "#f4f8fc",
    layers: [
      "radial-gradient(100% 80% at 10% 0%, rgba(147, 197, 253, 0.55), transparent 55%)",
      "radial-gradient(80% 60% at 90% 20%, rgba(196, 181, 253, 0.4), transparent 50%)",
      "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(241,245,249,0.6) 100%)",
    ],
    grain: 0.04,
    glow: "rgba(59, 130, 246, 0.12)",
  },
  "midnight-horizon": {
    id: "midnight-horizon",
    label: "Midnight Horizon",
    mood: "dark",
    base: "#030712",
    layers: [
      "radial-gradient(100% 55% at 50% 100%, rgba(37, 99, 235, 0.5), transparent 70%)",
      "radial-gradient(80% 40% at 80% 0%, rgba(244, 114, 182, 0.25), transparent 55%)",
      "linear-gradient(180deg, #020617 0%, #0f172a 100%)",
    ],
    grain: 0.05,
    glow: "rgba(96, 165, 250, 0.18)",
  },
  "nightfall": {
    id: "nightfall",
    label: "Nightfall",
    mood: "dark",
    base: "#0b1220",
    layers: [
      "radial-gradient(90% 60% at 50% 0%, rgba(30, 64, 175, 0.35), transparent 65%)",
      "linear-gradient(180deg, rgba(15,23,42,0.2) 0%, #0b1220 100%)",
    ],
    grain: 0.04,
    glow: "rgba(59, 130, 246, 0.14)",
  },
  "phantom-arc": {
    id: "phantom-arc",
    label: "Phantom Arc",
    mood: "dark",
    base: "#000000",
    layers: [
      "radial-gradient(90% 45% at 50% 85%, rgba(37, 99, 235, 0.55), transparent 60%)",
      "radial-gradient(60% 30% at 50% 100%, rgba(214, 188, 168, 0.12), transparent 70%)",
    ],
    grain: 0.05,
    glow: "rgba(59, 130, 246, 0.2)",
  },
  "glacier-mist": {
    id: "glacier-mist",
    label: "Glacier Mist",
    mood: "light",
    base: "#eef6ff",
    layers: [
      "radial-gradient(80% 70% at 0% 0%, rgba(34, 211, 238, 0.35), transparent 55%)",
      "radial-gradient(70% 60% at 100% 30%, rgba(99, 102, 241, 0.25), transparent 50%)",
    ],
    grain: 0.03,
    glow: "rgba(14, 165, 233, 0.1)",
  },
  "champagne-fizz": {
    id: "champagne-fizz",
    label: "Champagne Fizz",
    mood: "light",
    base: "#fffaf3",
    layers: [
      "radial-gradient(90% 70% at 20% 10%, rgba(251, 191, 36, 0.35), transparent 55%)",
      "radial-gradient(80% 60% at 90% 80%, rgba(251, 146, 60, 0.25), transparent 50%)",
    ],
    grain: 0.04,
    glow: "rgba(245, 158, 11, 0.12)",
  },
  "neon-skyline": {
    id: "neon-skyline",
    label: "Neon Skyline",
    mood: "dark",
    base: "#05010f",
    layers: [
      "radial-gradient(100% 50% at 50% 100%, rgba(6, 182, 212, 0.45), transparent 65%)",
      "radial-gradient(60% 40% at 50% 100%, rgba(236, 72, 153, 0.35), transparent 55%)",
    ],
    grain: 0.05,
    glow: "rgba(34, 211, 238, 0.2)",
  },
  "ember-glow": {
    id: "ember-glow",
    label: "Ember Glow",
    mood: "dark",
    base: "#1a0a0a",
    layers: [
      "radial-gradient(90% 60% at 50% 100%, rgba(244, 63, 94, 0.4), transparent 65%)",
      "radial-gradient(70% 50% at 20% 0%, rgba(251, 146, 60, 0.2), transparent 50%)",
    ],
    grain: 0.05,
    glow: "rgba(251, 113, 133, 0.16)",
  },
  "deep-lagoon": {
    id: "deep-lagoon",
    label: "Deep Lagoon",
    mood: "dark",
    base: "#04131a",
    layers: [
      "radial-gradient(90% 70% at 0% 100%, rgba(20, 184, 166, 0.35), transparent 55%)",
      "radial-gradient(80% 60% at 100% 0%, rgba(139, 92, 246, 0.3), transparent 50%)",
    ],
    grain: 0.05,
    glow: "rgba(45, 212, 191, 0.16)",
  },
};

export const AURA_THEME_LIST = Object.values(AURA_THEMES);

export function auraForMood(isDark: boolean, preferred?: AuraThemeId): AuraThemeMeta {
  if (preferred && AURA_THEMES[preferred]) return AURA_THEMES[preferred];
  return isDark ? AURA_THEMES["aurora-nova"] : AURA_THEMES["arctic-frost"];
}
