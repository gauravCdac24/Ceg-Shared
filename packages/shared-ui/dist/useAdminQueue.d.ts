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
export declare function useAdminQueue<Event = unknown>(opts: UseAdminQueueOptions<Event>): {
    events: Event[];
    status: SseStatus;
    error: string | null;
    reconnect: () => void;
    clear: () => void;
};
//# sourceMappingURL=useAdminQueue.d.ts.map