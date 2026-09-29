import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalizeJobStatus, isTerminalJobStatus, nextPollDelayMs, parseRetryAfterMs, createJobPoller, } from "./index";
describe("normalizeJobStatus", () => {
    it.each([
        ["done", "done"],
        ["completed", "done"],
        ["complete", "done"],
        ["ready", "done"],
        ["success", "done"],
        ["failed", "failed"],
        ["error", "failed"],
        ["running", "running"],
        ["processing", "running"],
        ["in_progress", "running"],
        ["queued", "queued"],
        ["pending", "queued"],
        ["unknown_state", "queued"],
    ])("maps %s → %s", (raw, expected) => {
        expect(normalizeJobStatus(raw)).toBe(expected);
    });
});
describe("isTerminalJobStatus", () => {
    it("done and failed are terminal", () => {
        expect(isTerminalJobStatus("done")).toBe(true);
        expect(isTerminalJobStatus("failed")).toBe(true);
    });
    it("queued and running are not terminal", () => {
        expect(isTerminalJobStatus("queued")).toBe(false);
        expect(isTerminalJobStatus("running")).toBe(false);
    });
});
describe("nextPollDelayMs", () => {
    it("grows exponentially up to max", () => {
        const d1 = nextPollDelayMs(800);
        const d2 = nextPollDelayMs(d1);
        expect(d1).toBeGreaterThan(800);
        expect(d2).toBeGreaterThan(d1);
    });
    it("is capped at max", () => {
        expect(nextPollDelayMs(100000, { max: 2000 })).toBeLessThanOrEqual(2000 + 200);
    });
});
describe("parseRetryAfterMs", () => {
    it("parses numeric seconds", () => {
        expect(parseRetryAfterMs({ "retry-after": "10" })).toBe(10000);
    });
    it("returns 5000 when missing", () => {
        expect(parseRetryAfterMs({})).toBe(5000);
    });
});
describe("createJobPoller", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("calls poll and emits snapshot on each tick", async () => {
        const statuses = ["running", "done"];
        let call = 0;
        const poll = vi.fn(async () => ({ status: statuses[call++] ?? "done", result: { ok: true } }));
        const snapshots = [];
        const { stop } = createJobPoller("job-1", poll, {
            onSnapshot: (s) => snapshots.push(s.status),
            initialDelayMs: 100,
        });
        await vi.runAllTimersAsync();
        stop();
        expect(poll).toHaveBeenCalledTimes(2);
        expect(snapshots).toContain("running");
        expect(snapshots).toContain("done");
    });
    it("calls onComplete when done", async () => {
        const poll = vi.fn(async () => ({ status: "done", result: { answer: 42 } }));
        const onComplete = vi.fn();
        const { stop } = createJobPoller("job-2", poll, {
            onSnapshot: vi.fn(),
            onComplete,
            initialDelayMs: 10,
        });
        await vi.runAllTimersAsync();
        stop();
        expect(onComplete).toHaveBeenCalledWith({ answer: 42 });
    });
    it("calls onFailed when failed", async () => {
        const poll = vi.fn(async () => ({ status: "failed", error: "out of memory" }));
        const onFailed = vi.fn();
        const { stop } = createJobPoller("job-3", poll, {
            onSnapshot: vi.fn(),
            onFailed,
            initialDelayMs: 10,
        });
        await vi.runAllTimersAsync();
        stop();
        expect(onFailed).toHaveBeenCalledWith("out of memory");
    });
    it("stops polling after stop() is called", async () => {
        let callCount = 0;
        const poll = vi.fn(async () => {
            callCount++;
            return { status: "running" };
        });
        const { stop } = createJobPoller("job-4", poll, {
            onSnapshot: vi.fn(),
            initialDelayMs: 50,
        });
        // Let it tick once
        await vi.advanceTimersByTimeAsync(10);
        stop();
        const countAfterStop = callCount;
        await vi.advanceTimersByTimeAsync(500);
        expect(callCount).toBe(countAfterStop);
    });
});
