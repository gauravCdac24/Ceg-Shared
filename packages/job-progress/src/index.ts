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
export function normalizeJobStatus(raw: string): NormalizedJobStatus {
  const s = raw.toLowerCase().trim();
  if (s === "done" || s === "completed" || s === "complete" || s === "ready" || s === "success") {
    return "done";
  }
  if (s === "failed" || s === "error") return "failed";
  if (s === "running" || s === "processing" || s === "in_progress") return "running";
  return "queued";
}

/** True when the job has reached a terminal state. */
export function isTerminalJobStatus(status: NormalizedJobStatus): boolean {
  return status === "done" || status === "failed";
}

/** Exponential back-off delay (ms) for job polling. */
export function nextPollDelayMs(current: number, opts?: { min?: number; max?: number }): number {
  const min = opts?.min ?? 500;
  const max = opts?.max ?? 8000;
  return Math.min(current * 1.5, max) + Math.random() * min * 0.2;
}

/** Parse a Retry-After header value into milliseconds (defaults to 5 s). */
export function parseRetryAfterMs(headers: Record<string, string | undefined>): number {
  const raw = headers["retry-after"] ?? headers["Retry-After"];
  if (!raw) return 5000;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n * 1000;
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return 5000;
}

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
export function createJobPoller(
  jobId: string,
  poll: PollFn,
  opts: JobPollerOptions,
): { stop: () => void } {
  const {
    onSnapshot,
    onComplete,
    onFailed,
    initialDelayMs = 800,
    maxDelayMs = 8000,
  } = opts;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const startedAt = Date.now();
  let delay = initialDelayMs;

  const elapsed = () => Date.now() - startedAt;

  const tick = async () => {
    if (stopped) return;
    try {
      const raw = await poll(jobId);
      if (stopped) return;
      const status = normalizeJobStatus(raw.status);
      const terminal = isTerminalJobStatus(status);
      const snapshot: JobPollSnapshot = {
        status,
        rawStatus: raw.status,
        progress: raw.progress,
        error: raw.error,
        elapsedMs: elapsed(),
        isTerminal: terminal,
        result: raw.result,
      };
      onSnapshot(snapshot);
      if (status === "done") {
        onComplete?.(raw.result);
        return;
      }
      if (status === "failed") {
        onFailed?.(raw.error ?? "Job failed");
        return;
      }
      delay = nextPollDelayMs(delay, { max: maxDelayMs });
      schedule();
    } catch (err) {
      if (stopped) return;
      // Honour Retry-After on 429
      const retryAfter = tryExtract429RetryAfter(err);
      delay = retryAfter ?? nextPollDelayMs(delay, { max: maxDelayMs });
      schedule();
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void tick(), delay);
  };

  void tick();

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

function tryExtract429RetryAfter(err: unknown): number | null {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { status?: number; headers?: Record<string, string> } }).response?.status === 429
  ) {
    const headers = (err as { response: { headers?: Record<string, string> } }).response.headers ?? {};
    return parseRetryAfterMs(headers);
  }
  return null;
}

/**
 * Subscribe to a backend SSE job-progress stream.
 *
 * Emits typed `JobProgressEvent` objects to `onEvent`. Calls `onError` on
 * stream failure and `onClose` when the stream ends.
 *
 * Returns a `close()` function.
 */
export function subscribeJobSSE(
  url: string,
  opts: {
    onEvent: (e: JobProgressEvent) => void;
    onError?: (err: Event) => void;
    onClose?: () => void;
  },
): { close: () => void } {
  const { onEvent, onError, onClose } = opts;
  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener("job_progress", (raw) => {
    try {
      const data = JSON.parse((raw as MessageEvent).data) as JobProgressEvent;
      onEvent(data);
    } catch {
      // ignore malformed events
    }
  });

  es.onerror = (e) => {
    onError?.(e);
    es.close();
    onClose?.();
  };

  return {
    close() {
      es.close();
      onClose?.();
    },
  };
}
