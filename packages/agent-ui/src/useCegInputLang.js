import { useEffect, useState } from 'react'

const CEG_LANG_KEY = 'ceg_lang_v1'

const CEG_LANG_BCP47 = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-PK',
}

function readCegLang() {
  try {
    const code = localStorage.getItem(CEG_LANG_KEY)
    if (code && CEG_LANG_BCP47[code]) return code
  } catch {
    /* ignore */
  }
  return 'en'
}

/** Live CeG language props for inputs (keyboard + IME). Listens to ceg-lang-changed. */
export function useCegInputLang() {
  const [code, setCode] = useState(readCegLang)

  useEffect(() => {
    const onLang = (e) => {
      if (e.detail?.code) setCode(e.detail.code)
      else setCode(readCegLang())
    }
    window.addEventListener('ceg-lang-changed', onLang)
    return () => window.removeEventListener('ceg-lang-changed', onLang)
  }, [])

  const bcp47 = CEG_LANG_BCP47[code] || CEG_LANG_BCP47.en
  return {
    code,
    lang: bcp47,
    dir: code === 'ur' ? 'rtl' : 'ltr',
    spellCheck: code === 'en',
    autoComplete: 'off',
    autoCorrect: 'off',
    'data-ceg-lang': code,
    inputClassName: 'ceg-editable-input notranslate',
    translate: 'no',
  }
}

export { CEG_LANG_BCP47 }
