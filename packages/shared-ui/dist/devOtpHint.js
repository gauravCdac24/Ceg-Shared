/** Dev-only OTP hint shown in UI when Vite dev mode or explicit env flag is set. */
export const DEV_OTP_HINT = '123456';
export function showDevOtpHint() {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
            return true;
        }
    }
    catch {
        // ignore
    }
    return false;
}
//# sourceMappingURL=devOtpHint.js.map