const LOGIN_NOTICE_KEY = 'ceg.login.notice';

/** Persist login banner state across full-page navigations from commercial flows. */
export function storeLoginNotice(state) {
  if (!state || typeof state !== 'object') return;
  try {
    sessionStorage.setItem(LOGIN_NOTICE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Read once on login page mount (pairs with storeLoginNotice). */
export function consumeLoginNotice() {
  try {
    const raw = sessionStorage.getItem(LOGIN_NOTICE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Same-origin navigation without react-router hook (avoids duplicate-router context bugs). */
export function commercialNavigate(href, options = {}) {
  if (!href) return;
  if (href.startsWith('http')) {
    window.location.href = href;
    return;
  }
  if (options.state) {
    storeLoginNotice(options.state);
  }
  window.location.assign(href);
}
