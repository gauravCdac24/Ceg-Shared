import type { APIRequestContext, Playwright } from "@playwright/test";

import type { Account } from "../fixtures/accounts";

export type ValidationErrorItem = { field: string; message: string; code?: string };

function unwrapData<T>(body: Record<string, unknown>): T {
  if (body.data !== undefined && body.data !== null) {
    return body.data as T;
  }
  return body as T;
}

/** Normalise CeG 422 envelopes (`errors` top-level or nested under `error.details`). */
export function parseValidationErrors(body: Record<string, unknown>): ValidationErrorItem[] {
  const nested = body.error as { details?: unknown } | undefined;
  const candidate = body.errors ?? nested?.details ?? body.data;
  return Array.isArray(candidate) ? (candidate as ValidationErrorItem[]) : [];
}

export async function createAuthenticatedApiContext(
  playwright: Playwright,
  acct: Account,
  storagePath = `auth/${acct.storageKey}.json`,
): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({
    baseURL: acct.frontendOrigin,
    storageState: storagePath,
  });
  // CeG sets double-submit CSRF cookie on first same-origin GET when CSRF_ENABLED.
  await ctx.get("/v1/auth/me", { timeout: 60_000 });
  return ctx;
}

function csrfHeaderFromState(state: { cookies: Array<{ name: string; value: string }> }): Record<string, string> {
  const token = state.cookies.find((c) => c.name === "ceg_csrf_token")?.value;
  return token ? { "X-CSRF-Token": token } : {};
}

export async function postWithCsrf(
  api: APIRequestContext,
  url: string,
  data: unknown,
  opts: { timeout?: number } = {},
): Promise<Awaited<ReturnType<APIRequestContext["post"]>>> {
  const state = await api.storageState();
  return api.post(url, {
    data,
    headers: csrfHeaderFromState(state),
    timeout: opts.timeout ?? 30_000,
  });
}

const E2E_TIMESLOT = "Morning E2E";

function isoDateDaysAhead(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type DateRow = { id: number; ddate: string };
type TimeRow = { id: number; proposed_time: string };

/** Ensure visit date, time label, and capacity row exist (admin API). Idempotent. */
export async function ensureE2eVisitSlot(
  api: APIRequestContext,
  opts: { slotDate?: string; timeslot?: string } = {},
): Promise<{ dateOfVisit: string; timeslot: string }> {
  const dateOfVisit = opts.slotDate ?? isoDateDaysAhead(14);
  const timeslot = opts.timeslot ?? E2E_TIMESLOT;

  const datesRes = await api.get("/v1/admin/visit-config/dates");
  if (datesRes.status() >= 400) {
    throw new Error(`GET visit-config/dates → ${datesRes.status()}: ${await datesRes.text()}`);
  }
  const dates = (await datesRes.json()) as DateRow[];
  if (!dates.some((row) => row.ddate === dateOfVisit)) {
    const addDate = await postWithCsrf(api, "/v1/admin/visit-config/dates", { date: dateOfVisit });
    if (addDate.status() >= 400 && addDate.status() !== 409) {
      throw new Error(`POST visit-config/dates → ${addDate.status()}: ${await addDate.text()}`);
    }
  }

  const timesRes = await api.get("/v1/admin/visit-config/times");
  if (timesRes.status() >= 400) {
    throw new Error(`GET visit-config/times → ${timesRes.status()}: ${await timesRes.text()}`);
  }
  const times = (await timesRes.json()) as TimeRow[];
  if (!times.some((row) => row.proposed_time === timeslot)) {
    const addTime = await postWithCsrf(api, "/v1/admin/visit-config/times", { time: timeslot });
    if (addTime.status() >= 400 && addTime.status() !== 409) {
      throw new Error(`POST visit-config/times → ${addTime.status()}: ${await addTime.text()}`);
    }
  }

  const addSlot = await postWithCsrf(api, "/v1/admin/visit-config/slots", {
    slot_date: dateOfVisit,
    timeslot,
    max_capacity: 60,
  });
  if (addSlot.status() >= 400 && addSlot.status() !== 409) {
    throw new Error(`POST visit-config/slots → ${addSlot.status()}: ${await addSlot.text()}`);
  }

  return { dateOfVisit, timeslot };
}

export type VisitAvailability = {
  availableDates: string[];
  timeSlots: string[];
  timeSlotsByDate: Record<string, string[]>;
};

export async function fetchVisitAvailability(api: APIRequestContext): Promise<VisitAvailability> {
  const res = await api.get("/v1/visits/availability");
  if (res.status() >= 400) {
    throw new Error(`GET /v1/visits/availability → ${res.status()}: ${await res.text()}`);
  }
  const body = (await res.json()) as Record<string, unknown>;
  const data = unwrapData<VisitAvailability>(body);
  return {
    availableDates: Array.isArray(data.availableDates) ? data.availableDates : [],
    timeSlots: Array.isArray(data.timeSlots) ? data.timeSlots : [],
    timeSlotsByDate:
      data.timeSlotsByDate && typeof data.timeSlotsByDate === "object"
        ? (data.timeSlotsByDate as Record<string, string[]>)
        : {},
  };
}

function pickFirstSlot(avail: VisitAvailability): { dateOfVisit: string; timeslot: string } | null {
  const today = new Date().toISOString().slice(0, 10);
  for (const dateOfVisit of avail.availableDates) {
    if (dateOfVisit < today) continue;
    const perDate = avail.timeSlotsByDate[dateOfVisit];
    const timeslot = (Array.isArray(perDate) && perDate[0]) || avail.timeSlots[0];
    if (timeslot) return { dateOfVisit, timeslot };
  }
  return null;
}

export type ScheduleVisitOptions = {
  organisation?: string;
  purpose?: string;
  mobile?: string;
  name?: string;
  email?: string;
  dateOfVisit?: string;
  timeslot?: string;
};

/** POST /v1/visits/schedule using the first open slot, or null when none configured. */
export async function scheduleVisitViaApi(
  api: APIRequestContext,
  acct: Account,
  opts: ScheduleVisitOptions = {},
): Promise<{ id: number } | null> {
  const slot =
    opts.dateOfVisit && opts.timeslot
      ? { dateOfVisit: opts.dateOfVisit, timeslot: opts.timeslot }
      : pickFirstSlot(await fetchVisitAvailability(api));
  if (!slot) return null;

  const res = await postWithCsrf(
    api,
    "/v1/visits/schedule",
    {
      dateOfVisit: slot.dateOfVisit,
      timeslot: slot.timeslot,
      visitMode: "OFFLINE",
      name: opts.name ?? "Faculty Test",
      email: opts.email ?? acct.email,
      organisation: opts.organisation ?? "CDAC Pune",
      mobile: opts.mobile ?? "9845162703",
      designation: "Professor",
      purpose: opts.purpose ?? "e2e schedule",
      numberOfVisitors: 10,
    },
    { timeout: 90_000 },
  );
  if (res.status() >= 400) {
    throw new Error(`POST /v1/visits/schedule → ${res.status()}: ${await res.text()}`);
  }
  const body = (await res.json()) as Record<string, unknown>;
  const data = unwrapData<Record<string, unknown>>(body);
  const id = Number(data.id);
  if (!Number.isFinite(id)) {
    throw new Error(`schedule response missing numeric id: ${JSON.stringify(body)}`);
  }
  return { id };
}
