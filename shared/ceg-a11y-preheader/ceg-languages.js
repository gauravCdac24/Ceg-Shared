/**
 * CeG canonical languages — 22 Eighth Schedule languages + English.
 * Single source for a11y bar, tour picker, studio chrome, route locale strip.
 */

/** @typedef {{ code: string, label: string, englishLabel: string, gtCode: string, hasTourUi?: boolean }} CegLanguageDef */

/** @type {CegLanguageDef[]} */
export const CEG_LANGUAGES = [
  { code: 'en', label: 'English', englishLabel: 'English', gtCode: '', hasTourUi: true },
  { code: 'as', label: 'অসমীয়া', englishLabel: 'Assamese', gtCode: 'as' },
  { code: 'bn', label: 'বাংলা', englishLabel: 'Bengali', gtCode: 'bn', hasTourUi: true },
  { code: 'brx', label: 'बड़ो', englishLabel: 'Bodo', gtCode: 'brx' },
  { code: 'doi', label: 'डोगरी', englishLabel: 'Dogri', gtCode: 'doi' },
  { code: 'gu', label: 'ગુજરાતી', englishLabel: 'Gujarati', gtCode: 'gu', hasTourUi: true },
  { code: 'hi', label: 'हिन्दी', englishLabel: 'Hindi', gtCode: 'hi', hasTourUi: true },
  { code: 'kn', label: 'ಕನ್ನಡ', englishLabel: 'Kannada', gtCode: 'kn', hasTourUi: true },
  { code: 'ks', label: 'کٲشُر', englishLabel: 'Kashmiri', gtCode: 'ks' },
  { code: 'kok', label: 'कोंकणी', englishLabel: 'Konkani', gtCode: 'gom' },
  { code: 'mai', label: 'मैथिली', englishLabel: 'Maithili', gtCode: 'mai' },
  { code: 'ml', label: 'മലയാളം', englishLabel: 'Malayalam', gtCode: 'ml', hasTourUi: true },
  { code: 'mni', label: 'ꯃꯤꯇꯩ ꯂꯣꯟ', englishLabel: 'Manipuri', gtCode: 'mni' },
  { code: 'mr', label: 'मराठी', englishLabel: 'Marathi', gtCode: 'mr', hasTourUi: true },
  { code: 'ne', label: 'नेपाली', englishLabel: 'Nepali', gtCode: 'ne' },
  { code: 'or', label: 'ଓଡ଼ିଆ', englishLabel: 'Odia', gtCode: 'or' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', englishLabel: 'Punjabi', gtCode: 'pa', hasTourUi: true },
  { code: 'sa', label: 'संस्कृतम्', englishLabel: 'Sanskrit', gtCode: 'sa' },
  { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ', englishLabel: 'Santali', gtCode: 'sat' },
  { code: 'sd', label: 'سنڌي', englishLabel: 'Sindhi', gtCode: 'sd' },
  { code: 'ta', label: 'தமிழ்', englishLabel: 'Tamil', gtCode: 'ta', hasTourUi: true },
  { code: 'te', label: 'తెలుగు', englishLabel: 'Telugu', gtCode: 'te', hasTourUi: true },
  { code: 'ur', label: 'اردو', englishLabel: 'Urdu', gtCode: 'ur' },
];

/** @type {{ code: string, label: string, gtCode: string }[]} */
export const CEG_A11Y_LANGUAGES = CEG_LANGUAGES.map(({ code, label, gtCode }) => ({ code, label, gtCode }));

/** Tour offer modal — englishLabel + native label; beta when UI strings fall back to English. */
export const CEG_TOUR_UI_LOCALES = CEG_LANGUAGES.map(({ code, label, englishLabel, hasTourUi }) => ({
  code,
  label: englishLabel,
  native: code === 'en' ? 'English' : label,
  beta: code !== 'en' && !hasTourUi,
}));

export const CEG_INDIAN_LANGUAGE_CODES = CEG_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

export const CEG_LANG_BCP47 = Object.fromEntries(
  CEG_LANGUAGES.map(({ code }) => {
    if (code === 'en') return [code, 'en-IN'];
    if (code === 'ur') return [code, 'ur-PK'];
    if (code === 'ks') return [code, 'ks-IN'];
    if (code === 'sd') return [code, 'sd-IN'];
    return [code, `${code}-IN`];
  }),
);

/** Regex fragment for public route locale strip — all schedule language codes. */
export const CEG_LOCALE_PATH_PREFIX = CEG_LANGUAGES.filter((l) => l.code !== 'en')
  .map((l) => l.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
