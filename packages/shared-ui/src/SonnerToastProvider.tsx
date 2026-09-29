import * as React from "react";
import { CegSonnerToaster, type CegSonnerToasterProps } from "./sonnerToast";

export type SonnerToastProviderProps = CegSonnerToasterProps & {
  children: React.ReactNode;
};

/**
 * Mounts children + fleet Sonner toaster. Use at app root or inside AdminShell.
 * For app-wide toast, prefer a single provider per app (not nested shells).
 */
export function SonnerToastProvider({ children, ...toasterProps }: SonnerToastProviderProps) {
  return (
    <>
      {children}
      <CegSonnerToaster {...toasterProps} />
    </>
  );
}
