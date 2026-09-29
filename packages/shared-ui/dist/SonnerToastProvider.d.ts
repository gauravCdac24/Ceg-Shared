import * as React from "react";
import { type CegSonnerToasterProps } from "./sonnerToast";
export type SonnerToastProviderProps = CegSonnerToasterProps & {
    children: React.ReactNode;
};
/**
 * Mounts children + fleet Sonner toaster. Use at app root or inside AdminShell.
 * For app-wide toast, prefer a single provider per app (not nested shells).
 */
export declare function SonnerToastProvider({ children, ...toasterProps }: SonnerToastProviderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SonnerToastProvider.d.ts.map