import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { CegSonnerToaster } from "./sonnerToast";
/**
 * Mounts children + fleet Sonner toaster. Use at app root or inside AdminShell.
 * For app-wide toast, prefer a single provider per app (not nested shells).
 */
export function SonnerToastProvider({ children, ...toasterProps }) {
    return (_jsxs(_Fragment, { children: [children, _jsx(CegSonnerToaster, { ...toasterProps })] }));
}
//# sourceMappingURL=SonnerToastProvider.js.map