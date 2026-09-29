/**
 * Default user-facing copy for shared UI primitives.
 * Products may override per-instance; these are fallbacks only.
 */
export declare const uiCopy: {
    readonly alert: {
        readonly info: "Here's what you need to know.";
        readonly success: "All set — your changes were saved.";
        readonly warning: "Please review this before continuing.";
        readonly error: "Something went wrong. Please try again.";
    };
    readonly emptyState: {
        readonly title: "Nothing here yet";
        readonly description: "When items are added, they'll appear in this list.";
        readonly action: "Get started";
    };
    readonly errorBoundary: {
        readonly title: "This page couldn't load";
        readonly description: "Try refreshing the page. If the problem continues, contact your administrator.";
        readonly retry: "Try again";
    };
    readonly modal: {
        readonly close: "Close";
    };
    readonly toast: {
        readonly success: "Done.";
        readonly error: "Something went wrong. Please try again.";
        readonly warning: "Please check and try again.";
        readonly info: "Heads up.";
    };
    readonly form: {
        readonly serverRejected: "We couldn't save your changes. Please check the highlighted fields and try again.";
        readonly pincodeLookupBusy: "Looking up your area…";
        readonly pincodeAutoFilled: (state: string) => string;
        readonly pincodeCached: (state: string) => string;
        readonly pincodeTimeout: "We couldn't look up this pincode. Please enter state and city manually.";
        readonly pincodeNotFound: "This pincode wasn't found. Please enter state and city manually.";
        readonly selectState: "— Select state —";
        readonly selectCity: "— Select city —";
        readonly cityOther: "Other (type below)";
        readonly stateRequired: "Please select a state";
        readonly cityRequired: "Please enter a city";
    };
    readonly queue: {
        readonly connecting: "Connecting to live updates…";
        readonly handshakeFailed: "Live updates are temporarily unavailable.";
        readonly sessionExpired: "Your session expired. Sign in again to see live updates.";
        readonly reconnect: "Reconnect";
    };
};
//# sourceMappingURL=copy.d.ts.map