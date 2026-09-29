/** Dev-only OTP hint shown in UI when Vite dev mode or explicit env flag is set. */
export const DEV_OTP_HINT = '123456';

export function showDevOtpHint(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
