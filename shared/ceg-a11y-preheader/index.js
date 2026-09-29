/**
 * CeG-parity helpers: Google Translate cookies + accessibility DOM state.
 * Keep in sync with CeG-Portal/ceg-frontend AccessibilityBar behaviour.
 */

import { CEG_A11Y_LANGUAGES, CEG_LANG_BCP47 } from './ceg-languages.js';

export {
  CEG_LANGUAGES,
  CEG_A11Y_LANGUAGES,
  CEG_TOUR_UI_LOCALES,
  CEG_INDIAN_LANGUAGE_CODES,
  CEG_LANG_BCP47,
  CEG_LOCALE_PATH_PREFIX,
} from './ceg-languages.js';

export const CEG_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CEG_DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CEG_A11Y_KEY = 'ceg_a11y_v1';
export const CEG_LANG_KEY = 'ceg_lang_v1';

export const CEG_A11Y_DEFAULTS = {
  contrast: 'normal',
  fontSize: 100,
  textSpacing: false,
  lineHeight: false,
  dyslexia: false,
  focusMode: false,
  pauseAnim: false,
  bigCursor: false,
  adhdMode: false,
  highlightLinks: false,
  hideImages: false,
  textToSpeech: false,
  /** When true, apps should skip WebGL/Three.js hero backgrounds (static fallback). */
  disableWebGLBackground: false,
  onScreenKeyboard: false,
};

export function loadCegA11y() {
  try {
    const raw = localStorage.getItem(CEG_A11Y_KEY);
    if (!raw) return { ...CEG_A11Y_DEFAULTS };
    return { ...CEG_A11Y_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...CEG_A11Y_DEFAULTS };
  }
}

export function saveCegA11y(settings) {
  try {
    localStorage.setItem(CEG_A11Y_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** @param {Record<string, unknown>} s */
export function applyCegA11ySettings(s) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (s.contrast === 'high') html.style.filter = 'contrast(1.35) brightness(0.96)';
  else if (s.contrast === 'gray') html.style.filter = 'grayscale(1) contrast(1.08)';
  else if (s.contrast === 'dark') html.style.filter = 'saturate(0.55) brightness(0.9) contrast(1.12)';
  else html.style.filter = '';

  html.style.fontSize = `${s.fontSize}%`;
  html.style.letterSpacing = s.textSpacing ? '0.12em' : '';
  html.style.wordSpacing = s.textSpacing ? '0.16em' : '';
  html.style.lineHeight = s.lineHeight ? '2' : '';
  html.style.fontFamily = s.dyslexia ? '"OpenDyslexic","Comic Sans MS",Arial,sans-serif' : '';

  document.body.classList.toggle('_access_focus_mode', !!s.focusMode);
  document.body.classList.toggle('_access_pause_anim', !!s.pauseAnim);
  document.body.classList.toggle('_access_big_cursor', !!s.bigCursor);
  document.body.classList.toggle('_access_links', !!s.highlightLinks);
  document.body.classList.toggle('_access_adhd_mode', !!s.adhdMode);

  let imgStyle = document.getElementById('_access_hide_img');
  if (!imgStyle) {
    imgStyle = document.createElement('style');
    imgStyle.id = '_access_hide_img';
    document.head.appendChild(imgStyle);
  }
  imgStyle.textContent = s.hideImages ? 'img,video,[role="img"]{visibility:hidden!important}' : '';

  const webglOff = !!s.disableWebGLBackground;
  html.dataset.cegWebgl = webglOff ? 'off' : 'on';

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ceg-a11y-changed', { detail: s }));
  }
}

export function ensureGoogleTranslateHost() {
  if (typeof window === 'undefined') return;
  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return;
    // eslint-disable-next-line no-new
    new window.google.translate.TranslateElement(
      { pageLanguage: 'en', autoDisplay: false },
      'google_translate_el',
    );
  };
}

export function ensureGoogleTranslateElement() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('google_translate_el')) {
    const el = document.createElement('div');
    el.id = 'google_translate_el';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
}

export function initGoogleTranslate() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('_gt_script')) return;
  ensureGoogleTranslateHost();
  const s = document.createElement('script');
  s.id = '_gt_script';
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.head.appendChild(s);
}

export function setGoogTransCookie(targetCode) {
  const pair = targetCode === 'en' ? '/en/en' : `/en/${targetCode}`;
  document.cookie = `googtrans=${pair}; path=/`;
  const h = window.location.hostname;
  if (h && h !== 'localhost' && h !== '127.0.0.1') {
    document.cookie = `googtrans=${pair}; domain=.${h}; path=/`;
  }
}

export function triggerGoogleTranslate(targetCode) {
  if (targetCode === 'en') {
    const iframe = document.querySelector('.goog-te-banner-frame');
    if (iframe) {
      const btn = iframe.contentDocument?.querySelector('.goog-te-button button');
      if (btn) btn.click();
    }
    if (document.cookie.split(';').some((c) => c.trim().startsWith('googtrans='))) {
      setGoogTransCookie('en');
    }
    window.location.reload();
    return;
  }
  if (!document.getElementById('_gt_script')) {
    initGoogleTranslate();
  }
  setGoogTransCookie(targetCode);
  window.location.reload();
}

/**
 * @param {number} year
 * @param {string} [apiBase] e.g. http://127.0.0.1:5001 — CeG BFF /api/holidays
 * @returns {Promise<Record<string, Array<{ name: string, type: string }>>>}
 */
export async function fetchCegHolidaysMap(year, apiBase) {
  const map = {};
  if (!apiBase) return map;
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/holidays?year=${year}`);
    if (!res.ok) return map;
    const envelope = await res.json();
    const rows = Array.isArray(envelope?.data)
      ? envelope.data
      : Array.isArray(envelope) ? envelope : [];
    rows.forEach((h) => {
      const ds = String(h.date || h.holiday_date || '').slice(0, 10);
      if (ds.length < 10 || ds[4] !== '-' || ds[7] !== '-') return;
      const md = new Date(`${ds}T12:00:00`);
      if (Number.isNaN(md.getTime())) return;
      const key = `${md.getFullYear()}-${md.getMonth()}-${md.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push({
        name: h.name || h.description || 'Holiday',
        type: h.type || h.holiday_type || 'Holiday',
      });
    });
  } catch {
    /* ignore */
  }
  return map;
}

/** Call once on app load (before paint if possible). */
export function initCegA11yFromStorage() {
  if (typeof window === 'undefined') return;
  applyCegA11ySettings(loadCegA11y());
}

/** Restore googtrans cookie before React mounts so non-English reloads keep SPA routes working. */
export function initSavedCegLang() {
  if (typeof document === 'undefined') return;
  const code = loadCegLang();
  if (code === 'en') return;
  const entry = CEG_A11Y_LANGUAGES.find((l) => l.code === code);
  const target = entry?.gtCode && entry.gtCode.length > 0 ? entry.gtCode : code;
  if (target && target !== 'en') {
    setGoogTransCookie(target);
  }
}

/**
 * i18n lookup with English fallback — missing keys never break UI or routing labels.
 * @param {Record<string, Record<string, unknown>>} messages
 * @param {string} lang
 * @param {string} key
 * @param {string} [fallback]
 */
export function tSafe(messages, lang, key, fallback = key) {
  const bucket = messages?.[lang] || messages?.en || {};
  const en = messages?.en || {};
  const value = bucket[key] ?? en[key] ?? fallback;
  return typeof value === 'string' ? value : fallback;
}

export function loadCegLang() {
  try {
    const code = localStorage.getItem(CEG_LANG_KEY);
    if (code && CEG_A11Y_LANGUAGES.some((l) => l.code === code)) return code;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function saveCegLang(code) {
  try {
    localStorage.setItem(CEG_LANG_KEY, code);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ceg-lang-changed', { detail: { code } }));
    }
  } catch {
    /* ignore */
  }
}

export function getCegInputA11yProps(code) {
  const langCode = code || loadCegLang();
  const bcp47 = CEG_LANG_BCP47[langCode] || CEG_LANG_BCP47.en;
  return {
    lang: bcp47,
    dir: langCode === 'ur' || langCode === 'sd' || langCode === 'ks' ? 'rtl' : 'ltr',
    spellCheck: langCode === 'en',
    autoComplete: 'off',
    autoCorrect: 'off',
    'data-ceg-lang': langCode,
    className: 'ceg-editable-input notranslate',
    translate: 'no',
  };
}

export const CEG_EDITABLE_INPUT_SELECTOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="date"]):not([type="datetime-local"]):not([type="time"]):not([type="number"]):not([type="color"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), [contenteditable="true"]';

export const CEG_INPUT_CONTAINER_SELECTOR =
  '.pk-prompt-input, .ceg-agent-panel__footer, [data-ceg-input-container], form[data-ceg-input-form]';

export function applyCegInputLangToElement(el, code) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.matches(CEG_EDITABLE_INPUT_SELECTOR)) return;
  if (el.closest('.monaco-editor, .cm-editor, .cm-content')) return;
  const props = getCegInputA11yProps(code);
  if (el.getAttribute('data-ceg-lang') === props['data-ceg-lang'] && el.getAttribute('lang') === props.lang) return;
  el.setAttribute('lang', props.lang);
  el.setAttribute('dir', props.dir);
  el.setAttribute('data-ceg-lang', props['data-ceg-lang']);
  el.setAttribute('translate', props.translate);
  if ('spellcheck' in el) el.spellcheck = props.spellCheck;
  el.classList.add('ceg-editable-input', 'notranslate');
}

export function applyCegInputLangToContainer(el, code) {
  if (!(el instanceof HTMLElement)) return;
  const props = getCegInputA11yProps(code);
  if (el.getAttribute('data-ceg-lang') === props['data-ceg-lang']) return;
  el.setAttribute('lang', props.lang);
  el.setAttribute('dir', props.dir);
  el.setAttribute('data-ceg-lang', props['data-ceg-lang']);
  el.setAttribute('translate', props.translate);
  el.classList.add('notranslate');
}

export function syncAllCegInputLang(code) {
  if (typeof document === 'undefined') return;
  const langCode = code || loadCegLang();
  document.querySelectorAll(CEG_EDITABLE_INPUT_SELECTOR).forEach((el) => {
    applyCegInputLangToElement(el, langCode);
  });
  document.querySelectorAll(CEG_INPUT_CONTAINER_SELECTOR).forEach((el) => {
    applyCegInputLangToContainer(el, langCode);
  });
}

/** Sync lang attrs on newly mounted inputs only — avoids full-DOM scans every frame. */
export function syncAddedCegInputLang(nodes, code) {
  if (typeof document === 'undefined') return;
  const langCode = code || loadCegLang();
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.matches(CEG_EDITABLE_INPUT_SELECTOR)) applyCegInputLangToElement(node, langCode);
    if (node.matches(CEG_INPUT_CONTAINER_SELECTOR)) applyCegInputLangToContainer(node, langCode);
    node.querySelectorAll(CEG_EDITABLE_INPUT_SELECTOR).forEach((el) => applyCegInputLangToElement(el, langCode));
    node.querySelectorAll(CEG_INPUT_CONTAINER_SELECTOR).forEach((el) => applyCegInputLangToContainer(el, langCode));
  }
}

export function initCegInputLangSync() {
  if (typeof document === 'undefined') return () => {};

  const runFullSync = (code) => syncAllCegInputLang(code);

  const boot = () => runFullSync();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  const onLang = (e) => runFullSync(e.detail?.code);
  window.addEventListener('ceg-lang-changed', onLang);

  let debounceId = null;
  const observer = new MutationObserver((mutations) => {
    const added = [];
    for (const m of mutations) {
      if (m.type !== 'childList') continue;
      for (const node of m.addedNodes) added.push(node);
    }
    if (!added.length) return;
    if (debounceId) window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      debounceId = null;
      syncAddedCegInputLang(added);
    }, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    window.removeEventListener('ceg-lang-changed', onLang);
    if (debounceId) window.clearTimeout(debounceId);
    observer.disconnect();
  };
}

export { getIndicKeyboardLayout, INDIC_KEYBOARD_LAYOUTS, LANG_TO_KEYBOARD_FAMILY, CEG_SPECIAL_KEYS } from './indic-keyboard-layouts.js';
export {
  getFocusedEditable,
  insertAtFocusedField,
  isEditableElement,
  resolveEditableElement,
  registerFabricTextInsertHandler,
  EDITABLE_SELECTOR,
} from './insert-at-focus.js';
export { default as QuickExplain } from './QuickExplain.jsx';
export {
  CEG_QUICK_EXPLAIN_KEY,
  quickExplainStorageKey,
  hasSeenQuickExplain,
  markQuickExplainSeen,
} from './quickExplain.js';
