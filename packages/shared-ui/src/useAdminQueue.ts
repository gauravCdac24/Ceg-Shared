import * as React from "react";

import { uiCopy } from "./copy";

/**
 * `useAdminQueue` — subscribe to a backend SSE stream and keep a rolling list
 * of events in React state. Handles the handshake → ticket → EventSource flow
 * exposed by every backend's `/realtime/handshake` + `/realtime/<channel>`.
 *
 *   const { events, status, reconnect } = useAdminQueue({
 *     handshakeUrl: "/v1/realtime/handshake",
 *     channelUrl: "/v1/realtime/admin/visits",
 *     accessToken: tokens.get(),
 *     parse: (raw) => JSON.parse(raw) as VisitEvent,
 *   });
 *
 * Auto-reconnects with exponential backoff up to 30 s. Stops trying after
 * 401 from the handshake (caller must refresh the JWT and call `reconnect`).
 */

export type SseStatus = "idle" | "connecting" | "open" | "error" | "closed";

export type UseAdminQueueOptions<Event> = {
  /** POST endpoint that mints a single-use SSE ticket. */
  handshakeUrl: string;
  /** GET endpoint that returns the event-stream. The ticket is appended as `?ticket=`. */
  channelUrl: string;
  /** Current JWT for the handshake. The EventSource itself doesn't use it. */
  accessToken: string | null;
  /** Parse a single SSE data line; throw to drop the event. */
  parse?: (raw: string) => Event;
  /** Maximum events to keep in the rolling buffer. Default 200. */
  bufferSize?: number;
  /** When false, the hook will not open a connection. */
  enabled?: boolean;
};

export function useAdminQueue<Event = unknown>(opts: UseAdminQueueOptions<Event>) {
  const {
    handshakeUrl,
    channelUrl,
    accessToken,
    parse = (raw: string) => JSON.parse(raw) as Event,
    bufferSize = 200,
    enabled = true,
  } = opts;

  const [events, setEvents] = React.useState<Event[]>([]);
  const [status, setStatus] = React.useState<SseStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const esRef = React.useRef<EventSource | null>(null);
  const retryRef = React.useRef(0);
  const reconnectTimer = React.useRef<number | null>(null);
  const cancelledRef = React.useRef(false);

  const close = React.useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = React.useCallback(async () => {
    if (!enabled || !accessToken) return;
    cancelledRef.current = false;
    setStatus("connecting");
    setError(null);

    let ticket: string;
    try {
      const r = await fetch(handshakeUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!r.ok) {
        setStatus("error");
        setError(r.status === 401 ? uiCopy.queue.sessionExpired : uiCopy.queue.handshakeFailed);
        return;
      }
      const body = await r.json();
      ticket = body.ticket ?? body?.data?.ticket;
      if (!ticket) {
        setStatus("error");
        setError(uiCopy.queue.handshakeFailed);
        return;
      }
    } catch (exc) {
      setStatus("error");
      setError(uiCopy.queue.handshakeFailed);
      return;
    }

    if (cancelledRef.current) return;

    const url = `${channelUrl}${channelUrl.includes("?") ? "&" : "?"}ticket=${encodeURIComponent(ticket)}`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;
    retryRef.current = 0;

    es.onopen = () => {
      setStatus("open");
      setError(null);
    };

    const pendingRef: Event[] = [];
    let flushScheduled = false;

    const flushPending = () => {
      flushScheduled = false;
      if (!pendingRef.length) return;
      const batch = pendingRef.splice(0, pendingRef.length);
      setEvents((prev) => {
        const next = [...prev, ...batch];
        while (next.length > bufferSize) next.shift();
        return next;
      });
    };

    const scheduleFlush = () => {
      if (flushScheduled) return;
      flushScheduled = true;
      requestAnimationFrame(flushPending);
    };

    es.onmessage = (msg) => {
      try {
        pendingRef.push(parse(msg.data));
        scheduleFlush();
      } catch {
        /* swallow malformed events */
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects, but the server's ticket is single-use and
      // already consumed. We need a fresh ticket — close, backoff, redo handshake.
      setStatus("error");
      close();
      if (cancelledRef.current) return;
      const backoff = Math.min(30_000, 1000 * 2 ** Math.min(retryRef.current, 5));
      retryRef.current += 1;
      reconnectTimer.current = window.setTimeout(() => {
        void connect();
      }, backoff);
    };
  }, [accessToken, bufferSize, channelUrl, close, enabled, handshakeUrl, parse]);

  React.useEffect(() => {
    void connect();
    return () => {
      cancelledRef.current = true;
      close();
      setStatus("closed");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect]);

  const reconnect = React.useCallback(() => {
    retryRef.current = 0;
    close();
    void connect();
  }, [close, connect]);

  return { events, status, error, reconnect, clear: () => setEvents([]) };
}
