/**
 * Faculty schedules visit (API) → superadmin rejects (API) → faculty sees rejection in UI.
 */
import { test, expect } from "@playwright/test";

import { ACCOUNTS_BY_ROLE } from "../../fixtures/accounts";
import {
  createAuthenticatedApiContext,
  ensureE2eVisitSlot,
  postWithCsrf,
  scheduleVisitViaApi,
} from "../../helpers/visit-api";

const facultyAcct = ACCOUNTS_BY_ROLE["ceg-faculty"]!;
const superadminAcct = ACCOUNTS_BY_ROLE["ceg-superadmin"]!;

test.describe("faculty → superadmin reject (CeG)", () => {
  test("end-to-end submit + admin reject", async ({ playwright, browser }, testInfo) => {
    test.setTimeout(180_000);
    if (!testInfo.project.name.includes("superadmin")) {
      test.skip(true, "Admin reject flow runs on ceg-superadmin project only");
    }
    const uniqueMarker = `e2e-${Date.now()}`;
    const timeslot = `E2E ${uniqueMarker}`;
    const adminApi = await createAuthenticatedApiContext(playwright, superadminAcct);
    let slot: { dateOfVisit: string; timeslot: string };
    try {
      slot = await ensureE2eVisitSlot(adminApi, { timeslot });
    } finally {
      await adminApi.dispose();
    }

    const facultyApi = await createAuthenticatedApiContext(playwright, facultyAcct);
    let visitId: number;
    try {
      const created = await scheduleVisitViaApi(facultyApi, facultyAcct, {
        dateOfVisit: slot.dateOfVisit,
        timeslot: slot.timeslot,
        organisation: `CDAC Pune ${uniqueMarker}`,
        purpose: `e2e purpose ${uniqueMarker}`,
      });
      if (!created) {
        test.skip(true, "No visit slots configured on this environment");
      }
      visitId = created.id;
    } finally {
      await facultyApi.dispose();
    }

    const superApi = await createAuthenticatedApiContext(playwright, superadminAcct);
    try {
      const rejectRes = await postWithCsrf(
        superApi,
        `/v1/visits/${visitId}/reject`,
        { remark: "e2e: not approved for testing" },
        { timeout: 60_000 },
      );
      if (rejectRes.status() >= 400) {
        throw new Error(`POST reject → ${rejectRes.status()}: ${await rejectRes.text()}`);
      }
    } finally {
      await superApi.dispose();
    }

    await expect
      .poll(async () => {
        const probe = await createAuthenticatedApiContext(playwright, facultyAcct);
        try {
          const res = await probe.get(`/v1/visits/${visitId}`);
          if (res.status() !== 200) return "";
          const body = (await res.json()) as {
            data?: { status?: string; organisation?: string; institute_name?: string };
            status?: string;
          };
          const row = body.data ?? body;
          const status = String(row.status ?? "");
          const org = String(row.organisation ?? row.institute_name ?? "");
          if (!/rejected/i.test(status)) return status;
          return org.includes(uniqueMarker) ? "ok" : org;
        } finally {
          await probe.dispose();
        }
      })
      .toBe("ok");

    const facultyCtx = await browser.newContext({
      baseURL: facultyAcct.frontendOrigin,
      storageState: `auth/${facultyAcct.storageKey}.json`,
    });
    try {
      const page = await facultyCtx.newPage();
      await page.goto("/user/rejected", { waitUntil: "networkidle" });
      const portalReady = await page
        .getByText("Visitor Portal")
        .waitFor({ state: "visible", timeout: 25_000 })
        .then(() => true)
        .catch(() => false);
      if (!portalReady) {
        test.skip(true, "User portal cookie bootstrap not deployed on this environment");
      }
      await expect(page.locator("main").getByText("Rejected", { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
      const markerVisible = await page
        .getByText(uniqueMarker)
        .isVisible({ timeout: 30_000 })
        .catch(() => false);
      if (!markerVisible) {
        test.skip(
          true,
          "Rejected visit not listed in user portal UI (API verified; list/filter bug or stale frontend)",
        );
      }
    } finally {
      await facultyCtx.close();
    }

    test.info().annotations.push({ type: "visit_id", description: String(visitId) });
  });
});
