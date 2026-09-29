export { AmbientStage, AmbientFill, type AmbientStageProps, type AmbientFillProps } from "./AmbientStage";
export { AmbientBackgroundRenderer } from "./AmbientBackgroundRenderer";
export { AmbientStylePicker, type AmbientStylePickerProps } from "./AmbientStylePicker";
export { AuraGradientBackground } from "./aura/AuraGradientBackground";
export {
  AURA_THEMES,
  AURA_THEME_LIST,
  auraForMood,
  type AuraThemeId,
  type AuraThemeMeta,
} from "./aura/auraThemes";
export {
  resolveAmbientConfig,
  AMBIENT_STYLE_OPTIONS,
  isAuraThemeId,
  isAmbientEngine,
  type ProductId,
  type AmbientSurface,
  type AmbientEngine,
  type AmbientStyleId,
  type AmbientResolvedConfig,
} from "./ambientPresets";
export { readAmbientPreference, writeAmbientPreference, subscribeAmbientPreference } from "./ambientPreference";
