/**
 * Fleet Sonner toast stack — react-hot-toast compatible default export + CegSonnerToaster.
 * Golden reference: FetchDesk main.tsx (richColors, top-right, closeButton).
 */
import * as React from "react";
import { toast as sonnerToast, Toaster as SonnerToaster, type ExternalToast } from "sonner";

type ToastOpts = ExternalToast & {
  icon?: React.ReactNode;
  className?: string;
};

function normalizeMsg(message: unknown): string {
  if (message == null) return "";
  if (typeof message === "string") return message;
  if (typeof message === "object" && message !== null && "message" in message) {
    return String((message as { message: unknown }).message);
  }
  return String(message);
}

function normalizeOpts(opts: ToastOpts = {}): ExternalToast {
  const { icon, className, ...rest } = opts;
  const out: ExternalToast = { ...rest };
  if (className) {
    out.classNames = { ...(out.classNames ?? {}), toast: className };
  }
  if (icon != null) {
    out.icon = icon;
  }
  return out;
}

function emit(
  message: unknown,
  opts?: ToastOpts,
  fn: (message: string, data?: ExternalToast) => string | number = sonnerToast,
) {
  const msg = normalizeMsg(message);
  const o = normalizeOpts(opts);
  if (opts?.icon != null && fn === sonnerToast) {
    return sonnerToast.message(msg, o);
  }
  return fn(msg, o);
}

export const toast = Object.assign(
  (message: unknown, opts?: ToastOpts) => emit(message, opts),
  {
    success: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.success),
    error: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.error),
    info: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.info),
    warning: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.warning),
    loading: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.loading),
    message: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.message),
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
    promise: sonnerToast.promise.bind(sonnerToast),
    custom: (
      render: (id: string | number) => React.ReactElement,
      opts?: ToastOpts & { unstyled?: boolean },
    ) => {
      const o = normalizeOpts(opts);
      const duration = opts?.duration ?? o.duration ?? 5000;
      return sonnerToast.custom(render, { ...o, duration });
    },
    warn: (msg: unknown, opts?: ToastOpts) => emit(msg, opts, sonnerToast.warning),
  },
);

export type CegSonnerToasterProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  richColors?: boolean;
  closeButton?: boolean;
  duration?: number;
  toastOptions?: ExternalToast & {
    style?: React.CSSProperties;
    className?: string;
    classNames?: ExternalToast["classNames"];
    success?: { iconTheme?: { primary?: string; secondary?: string } };
    error?: { iconTheme?: { primary?: string; secondary?: string } };
  };
};

/** Maps legacy react-hot-toast Toaster styling to Sonner fleet defaults. */
export function CegSonnerToaster({
  position = "top-right",
  richColors = true,
  closeButton = true,
  duration,
  toastOptions = {},
}: CegSonnerToasterProps) {
  const style: React.CSSProperties = {
    background: "var(--bg-surface, var(--surface-elevated, #fff))",
    color: "var(--text-primary, #111)",
    border: "1px solid var(--border-glass, var(--border-subtle, #e5e7eb))",
    fontSize: "14px",
    maxWidth: "90vw",
    ...toastOptions.style,
  };

  const toastClass = toastOptions.className ?? toastOptions.classNames?.toast;

  return (
    <SonnerToaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      duration={duration ?? toastOptions.duration ?? 5000}
      expand
      visibleToasts={4}
      toastOptions={{
        ...toastOptions,
        style,
        classNames: {
          ...(toastOptions.classNames ?? {}),
          ...(toastClass ? { toast: toastClass } : {}),
        },
      }}
    />
  );
}

/** Alias for react-hot-toast `Toaster` import sites migrating to shared Sonner. */
export const Toaster = CegSonnerToaster;

export default toast;
