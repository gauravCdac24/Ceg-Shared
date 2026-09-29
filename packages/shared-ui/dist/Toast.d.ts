import * as React from "react";
export type ToastVariant = "success" | "error" | "warning" | "info";
export type ToastItem = {
    id: string;
    variant: ToastVariant;
    message: string;
    durationMs?: number;
};
export type ToastContextValue = {
    toasts: ToastItem[];
    show: (variant: ToastVariant, message?: string, opts?: {
        durationMs?: number;
    }) => void;
    dismiss: (id: string) => void;
    clear: () => void;
};
export type ToastProviderProps = {
    children: React.ReactNode;
    /** Default auto-dismiss duration. Set 0 to persist until dismissed. */
    durationMs?: number;
    position?: "top-right" | "bottom-right" | "bottom-center";
};
export declare function ToastProvider({ children, durationMs, position, }: ToastProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useToast(): ToastContextValue;
type ToastStackProps = {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
    position: NonNullable<ToastProviderProps["position"]>;
};
export declare function ToastStack({ toasts, onDismiss, position }: ToastStackProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=Toast.d.ts.map