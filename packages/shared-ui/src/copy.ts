/**
 * Default user-facing copy for shared UI primitives.
 * Products may override per-instance; these are fallbacks only.
 */
export const uiCopy = {
  alert: {
    info: "Here's what you need to know.",
    success: "All set — your changes were saved.",
    warning: "Please review this before continuing.",
    error: "Something went wrong. Please try again.",
  },
  emptyState: {
    title: "Nothing here yet",
    description: "When items are added, they'll appear in this list.",
    action: "Get started",
  },
  errorBoundary: {
    title: "This page couldn't load",
    description: "Try refreshing the page. If the problem continues, contact your administrator.",
    retry: "Try again",
  },
  modal: {
    close: "Close",
  },
  toast: {
    success: "Done.",
    error: "Something went wrong. Please try again.",
    warning: "Please check and try again.",
    info: "Heads up.",
  },
  form: {
    serverRejected: "We couldn't save your changes. Please check the highlighted fields and try again.",
    pincodeLookupBusy: "Looking up your area…",
    pincodeAutoFilled: (state: string) => `State and city filled for ${state}.`,
    pincodeCached: (state: string) => `State and city filled for ${state}.`,
    pincodeTimeout: "We couldn't look up this pincode. Please enter state and city manually.",
    pincodeNotFound: "This pincode wasn't found. Please enter state and city manually.",
    selectState: "— Select state —",
    selectCity: "— Select city —",
    cityOther: "Other (type below)",
    stateRequired: "Please select a state",
    cityRequired: "Please enter a city",
  },
  queue: {
    connecting: "Connecting to live updates…",
    handshakeFailed: "Live updates are temporarily unavailable.",
    sessionExpired: "Your session expired. Sign in again to see live updates.",
    reconnect: "Reconnect",
  },
} as const;
