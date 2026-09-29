import * as React from "react";
import { uiCopy } from "./copy";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
  durationMs?: number;
};

export type ToastContextValue = {
  toasts: ToastItem[];
  show: (variant: ToastVariant, message?: string, opts?: { durationMs?: number }) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const variantClass: Record<ToastVariant, string> = {
  success: "ceg-toast ceg-toast--success",
  error: "ceg-toast ceg-toast--error",
  warning: "ceg-toast ceg-toast--warning",
  info: "ceg-toast ceg-toast--info",
};

const defaultMessage: Record<ToastVariant, string> = {
  success: uiCopy.toast.success,
  error: uiCopy.toast.error,
  warning: uiCopy.toast.warning,
  info: uiCopy.toast.info,
};

function nextId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ToastProviderProps = {
  children: React.ReactNode;
  /** Default auto-dismiss duration. Set 0 to persist until dismissed. */
  durationMs?: number;
  position?: "top-right" | "bottom-right" | "bottom-center";
};

export function ToastProvider({
  children,
  durationMs = 4500,
  position = "bottom-right",
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timers = React.useRef<Map<string, number>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t != null) window.clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const show = React.useCallback(
    (variant: ToastVariant, message?: string, opts?: { durationMs?: number }) => {
      const id = nextId();
      const item: ToastItem = {
        id,
        variant,
        message: message ?? defaultMessage[variant],
        durationMs: opts?.durationMs ?? durationMs,
      };
      setToasts((prev) => [...prev, item]);
      if (item.durationMs && item.durationMs > 0) {
        const handle = window.setTimeout(() => dismiss(id), item.durationMs);
        timers.current.set(id, handle);
      }
    },
    [dismiss, durationMs],
  );

  const clear = React.useCallback(() => {
    timers.current.forEach((h) => window.clearTimeout(h));
    timers.current.clear();
    setToasts([]);
  }, []);

  React.useEffect(
    () => () => {
      timers.current.forEach((h) => window.clearTimeout(h));
      timers.current.clear();
    },
    [],
  );

  const value = React.useMemo(
    () => ({ toasts, show, dismiss, clear }),
    [toasts, show, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position: NonNullable<ToastProviderProps["position"]>;
};

const positionClass: Record<NonNullable<ToastProviderProps["position"]>, string> = {
  "top-right": "ceg-toast-stack--top-right",
  "bottom-right": "ceg-toast-stack--bottom-right",
  "bottom-center": "ceg-toast-stack--bottom-center",
};

export function ToastStack({ toasts, onDismiss, position }: ToastStackProps) {
  if (!toasts.length) return null;
  return (
    <div
      className={["ceg-toast-stack", positionClass[position]].join(" ")}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div key={t.id} className={variantClass[t.variant]} role="status">
          <span>{t.message}</span>
          <button type="button" className="ceg-toast__dismiss" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
