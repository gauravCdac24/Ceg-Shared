import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_PATH = '/v1/commercial/config/public';

/**
 * @param {{ fetchPublicConfig?: () => Promise<{ commercial_billing_enabled?: boolean }> }} opts
 */
export function useCommercialBillingEnabled({ fetchPublicConfig } = {}) {
  /** Live CeG Portal commercial backend is linked. */
  const [connected, setConnected] = useState(false);
  /** Config fetch failed (network / hard error) — not the same as billing disabled. */
  const [configError, setConfigError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!fetchPublicConfig) {
      setConnected(true);
      setConfigError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchPublicConfig();
      const data = res?.data ?? res;
      setConnected(Boolean(data?.commercial_billing_enabled));
      setConfigError(false);
    } catch {
      setConnected(false);
      setConfigError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchPublicConfig]);

  const loadStartedRef = useRef(false);

  useEffect(() => {
    if (loadStartedRef.current) return undefined;
    loadStartedRef.current = true;
    let cancelled = false;
    load()
      .catch(() => {
        if (!cancelled) setLoading(false);
      })
      .finally(() => {
        loadStartedRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  /** @deprecated use `connected` — kept for older callers */
  const enabled = connected;
  return { connected, enabled, configError, loading, reload: load };
}

export function defaultCommercialConfigFetch(base = '') {
  const root = String(base || '').replace(/\/+$/, '');
  return async () => {
    const res = await fetch(`${root}${DEFAULT_PATH}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Commercial config ${res.status}`);
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  };
}
