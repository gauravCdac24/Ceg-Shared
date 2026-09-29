/**
 * @ceg/job-progress
 *
 * Shared job-progress contract for all CEG products.
 *
 * Backend contract (return from any long-running job endpoint):
 *   POST /v1/…  → { job_id: string; status: "queued"; poll_url?: string }
 *
 * SSE event shape:
 *   event: job_progress
 *   data: { job_id, status, progress?, message?, result? }
 *
 * Products use `createJobPoller` (framework-agnostic) or the React
 * `useJobPoll` hook (re-exported from @ceg/job-progress/react).
 */
export type NormalizedJobStatus = "queued" | "running" | "done" | "failed";
/** Canonical job start response returned by every CEG backend. */
export type JobStartResponse = {
    job_id: string;
    status: "queued" | "running";
    poll_url?: string;
};
/** Snapshot provided to consumers on each poll. */
export type JobPollSnapshot = {
    status: NormalizedJobStatus;
    /** Raw status string from the backend (for product-specific handling). */
    rawStatus: string;
    /** Progress description from the backend, if any. */
    progress?: string;
    /** Error message when status === "failed". */
    error?: string;
    /** Elapsed milliseconds since polling started. */
    elapsedMs: number;
    /** True when polling has reached a terminal state (done | failed). */
    isTerminal: boolean;
    /** Full raw response data. */
    result?: unknown;
};
/** Canonical SSE event emitted by job-progress streams. */
export type JobProgressEvent = {
    job_id: string;
    status: string;
    progress?: string;
    message?: string;
    result?: unknown;
};
/** Map a raw backend status string to our normalized enum. */
export declare function normalizeJobStatus(raw: string): NormalizedJobStatus;
/** True when the job has reached a terminal state. */
export declare function isTerminalJobStatus(status: NormalizedJobStatus): boolean;
/** Exponential back-off delay (ms) for job polling. */
export declare function nextPollDelayMs(current: number, opts?: {
    min?: number;
    max?: number;
}): number;
/** Parse a Retry-After header value into milliseconds (defaults to 5 s). */
export declare function parseRetryAfterMs(headers: Record<string, string | undefined>): number;
export type PollFn = (jobId: string) => Promise<{
    status: string;
    progress?: string;
    error?: string;
    result?: unknown;
}>;
export type JobPollerOptions = {
    /** Called on each poll update. */
    onSnapshot: (s: JobPollSnapshot) => void;
    /** Called when status reaches "done". */
    onComplete?: (result?: unknown) => void;
    /** Called when status reaches "failed". */
    onFailed?: (error: string) => void;
    /** Initial poll interval in ms (default 800). */
    initialDelayMs?: number;
    /** Maximum poll interval in ms (default 8000). */
    maxDelayMs?: number;
};
/**
 * Framework-agnostic job poller.
 *
 * Returns a `stop()` function to cancel polling.
 *
 * @example
 * ```ts
 * const stop = createJobPoller("job-123", fetchJobStatus, {
 *   onSnapshot: (s) => console.log(s.status),
 *   onComplete: (result) => console.log("done", result),
 *   onFailed: (err) => console.error("failed", err),
 * });
 * // later:
 * stop();
 * ```
 */
export declare function createJobPoller(jobId: string, poll: PollFn, opts: JobPollerOptions): {
    stop: () => void;
};
/**
 * Subscribe to a backend SSE job-progress stream.
 *
 * Emits typed `JobProgressEvent` objects to `onEvent`. Calls `onError` on
 * stream failure and `onClose` when the stream ends.
 *
 * Returns a `close()` function.
 */
export declare function subscribeJobSSE(url: string, opts: {
    onEvent: (e: JobProgressEvent) => void;
    onError?: (err: Event) => void;
    onClose?: () => void;
}): {
    close: () => void;
};
//# sourceMappingURL=index.d.ts.map