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
/** Map a raw backend status string to our normalized enum. */
export function normalizeJobStatus(raw) {
    const s = raw.toLowerCase().trim();
    if (s === "done" || s === "completed" || s === "complete" || s === "ready" || s === "success") {
        return "done";
    }
    if (s === "failed" || s === "error")
        return "failed";
    if (s === "running" || s === "processing" || s === "in_progress")
        return "running";
    return "queued";
}
/** True when the job has reached a terminal state. */
export function isTerminalJobStatus(status) {
    return status === "done" || status === "failed";
}
/** Exponential back-off delay (ms) for job polling. */
export function nextPollDelayMs(current, opts) {
    const min = opts?.min ?? 500;
    const max = opts?.max ?? 8000;
    return Math.min(current * 1.5, max) + Math.random() * min * 0.2;
}
/** Parse a Retry-After header value into milliseconds (defaults to 5 s). */
export function parseRetryAfterMs(headers) {
    const raw = headers["retry-after"] ?? headers["Retry-After"];
    if (!raw)
        return 5000;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0)
        return n * 1000;
    const date = Date.parse(raw);
    if (!Number.isNaN(date))
        return Math.max(0, date - Date.now());
    return 5000;
}
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
export function createJobPoller(jobId, poll, opts) {
    const { onSnapshot, onComplete, onFailed, initialDelayMs = 800, maxDelayMs = 8000, } = opts;
    let stopped = false;
    let timer = null;
    const startedAt = Date.now();
    let delay = initialDelayMs;
    const elapsed = () => Date.now() - startedAt;
    const tick = async () => {
        if (stopped)
            return;
        try {
            const raw = await poll(jobId);
            if (stopped)
                return;
            const status = normalizeJobStatus(raw.status);
            const terminal = isTerminalJobStatus(status);
            const snapshot = {
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
        }
        catch (err) {
            if (stopped)
                return;
            // Honour Retry-After on 429
            const retryAfter = tryExtract429RetryAfter(err);
            delay = retryAfter ?? nextPollDelayMs(delay, { max: maxDelayMs });
            schedule();
        }
    };
    const schedule = () => {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => void tick(), delay);
    };
    void tick();
    return {
        stop() {
            stopped = true;
            if (timer)
                clearTimeout(timer);
        },
    };
}
function tryExtract429RetryAfter(err) {
    if (err &&
        typeof err === "object" &&
        "response" in err &&
        err.response?.status === 429) {
        const headers = err.response.headers ?? {};
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
export function subscribeJobSSE(url, opts) {
    const { onEvent, onError, onClose } = opts;
    const es = new EventSource(url, { withCredentials: true });
    es.addEventListener("job_progress", (raw) => {
        try {
            const data = JSON.parse(raw.data);
            onEvent(data);
        }
        catch {
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
