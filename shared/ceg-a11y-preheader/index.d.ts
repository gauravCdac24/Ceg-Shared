export interface CegLang {
  code: string;
  label: string;
  gtCode: string;
}

export interface CegLanguageDef extends CegLang {
  englishLabel: string;
  hasTourUi?: boolean;
}

export interface CegTourLocale {
  code: string;
  label: string;
  native: string;
  beta: boolean;
}

export const CEG_LANGUAGES: CegLanguageDef[];
export const CEG_TOUR_UI_LOCALES: CegTourLocale[];
export const CEG_INDIAN_LANGUAGE_CODES: string[];
export const CEG_LANG_BCP47: Record<string, string>;
export const CEG_LOCALE_PATH_PREFIX: string;

export interface CegA11ySettings {
  contrast: 'normal' | 'high' | 'gray' | 'dark';
  fontSize: number;
  textSpacing: boolean;
  lineHeight: boolean;
  dyslexia: boolean;
  focusMode: boolean;
  pauseAnim: boolean;
  bigCursor: boolean;
  adhdMode: boolean;
  highlightLinks: boolean;
  hideImages: boolean;
  textToSpeech: boolean;
  /** Skip WebGL / Three.js decorative backgrounds; use static fallbacks instead. */
  disableWebGLBackground: boolean;
  onScreenKeyboard: boolean;
}

export const CEG_A11Y_LANGUAGES: CegLang[];
export const CEG_MONTH_NAMES: string[];
export const CEG_DAY_NAMES: string[];
export const CEG_A11Y_KEY: string;
export const CEG_A11Y_DEFAULTS: CegA11ySettings;

export function loadCegA11y(): CegA11ySettings;
export function saveCegA11y(settings: CegA11ySettings): void;
export function applyCegA11ySettings(s: CegA11ySettings): void;
export function ensureGoogleTranslateHost(): void;
export function ensureGoogleTranslateElement(): void;
export function initGoogleTranslate(): void;
export function setGoogTransCookie(targetCode: string): void;
export function triggerGoogleTranslate(targetCode: string): void;
export function fetchCegHolidaysMap(
  year: number,
  apiBase?: string,
): Promise<Record<string, Array<{ name: string; type: string }>>>;
export function initCegA11yFromStorage(): void;
export function initSavedCegLang(): void;
export const CEG_LANG_KEY: string;
export function loadCegLang(): string;
export function saveCegLang(code: string): void;
export function syncAllCegInputLang(code?: string): void;
export function initCegInputLangSync(): () => void;
export function tSafe(
  messages: Record<string, Record<string, unknown>>,
  lang: string,
  key: string,
  fallback?: string,
): string;

export const CEG_QUICK_EXPLAIN_KEY: string;
export function quickExplainStorageKey(featureKey: string, userId?: string | null): string;
export function hasSeenQuickExplain(featureKey: string, userId?: string | null): boolean;
export function markQuickExplainSeen(featureKey: string, userId?: string | null): void;

export interface QuickExplainProps {
  featureKey: string;
  text: string;
  userId?: string | null;
  dismissMs?: number;
  position?: 'auto' | 'top' | 'bottom';
  children: import('react').ReactNode;
}

declare const QuickExplain: import('react').FC<QuickExplainProps>;
export { QuickExplain };

export interface IndicKeyboardLayout {
  label: string;
  rtl?: boolean;
  rows: string[][];
  bottom?: string[];
}

export const CEG_SPECIAL_KEYS: string[];
export const INDIC_KEYBOARD_LAYOUTS: Record<string, IndicKeyboardLayout>;
export const LANG_TO_KEYBOARD_FAMILY: Record<string, string>;
export function getIndicKeyboardLayout(langCode: string): IndicKeyboardLayout;
export function insertAtFocusedField(action: string): boolean;
export function getFocusedEditable(): HTMLElement | null;
export function registerFabricTextInsertHandler(fn: ((action: string) => boolean) | null): void;
export function isEditableElement(el: Element | null): boolean;
