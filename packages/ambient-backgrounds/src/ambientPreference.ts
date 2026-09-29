import type { AmbientStyleId, ProductId } from "./ambientPresets";

const STORAGE_KEYS: Record<ProductId, string> = {
  fetchdesk: "fd_ambient_style",
  workshopos: "wos_ambient_style",
};

const EVENT = "ceg:ambient-style";
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function readAmbientPreference(product: ProductId): AmbientStyleId {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[product]);
    if (!raw) return "auto";
    return raw as AmbientStyleId;
  } catch {
    return "auto";
  }
}

export function writeAmbientPreference(product: ProductId, style: AmbientStyleId): void {
  try {
    if (style === "auto") {
      localStorage.removeItem(STORAGE_KEYS[product]);
    } else {
      localStorage.setItem(STORAGE_KEYS[product], style);
    }
  } catch {
    /* ignore */
  }
  emitChange();
}

export function subscribeAmbientPreference(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window === "undefined") return () => listeners.delete(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.fetchdesk || e.key === STORAGE_KEYS.workshopos) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
