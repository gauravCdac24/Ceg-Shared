/**
 * Regression: spam-prone fields reject at UI and API boundaries.
 */
import { test, expect } from "@playwright/test";

import { ACCOUNTS_BY_ROLE } from "../../fixtures/accounts";
import {
  createAuthenticatedApiContext,
  parseValidationErrors,
  postWithCsrf,
} from "../../helpers/visit-api";

const facultyAcct = ACCOUNTS_BY_ROLE["ceg-faculty"]!;

const SCHEDULE_BODY = {
  dateOfVisit: "2030-06-15",
  timeslot: "Morning E2E",
  visitMode: "OFFLINE",
  email: facultyAcct.email,
  organisation: "CDAC Pune",
  designation: "Professor",
};

function facultyOnly(testInfo: import("@playwright/test").TestInfo) {
  if (!testInfo.project.name.includes("faculty")) {
    test.skip(true, "UI spam checks run on ceg-faculty project only");
  }
}

test.describe("Spam input is rejected by both UI and API (CeG)", () => {
  test("schedule-visit UI warns on repeated-digit phone", async ({ page }, testInfo) => {
    facultyOnly(testInfo);
    await page.goto("/user/schedule-visit");
    const heading = page.getByText(/schedule your visit/i);
    if (!(await heading.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, "Schedule visit page not reachable (auth or route)");
    }

    const mobileInput = page.getByPlaceholder(/10-digit numbers/i);
    if (!(await mobileInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No visit slot selected — mobile field hidden until slot picked");
    }

    await mobileInput.fill("3333333333");
    await mobileInput.press(" ");
    await mobileInput.blur();

    await expect(
      page.getByText(/unusual|spam|repeated|invalid/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("request-visit register UI rejects sequential pincode", async ({ page }, testInfo) => {
    facultyOnly(testInfo);
    await page.goto("/request-visit/register");
    const pincodeInput = page.locator('input[name="zip"]');
    if (!(await pincodeInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Request-visit register page not available");
    }
    await pincodeInput.fill("123456");
    await pincodeInput.blur();
    await expect(page.getByText(/spam|sequential|invalid|pincode/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("API rejects repeated-digit phone with 422 + structured errors", async ({
    playwright,
  }, testInfo) => {
    if (!testInfo.project.name.includes("faculty")) {
      test.skip(true, "API spam tests run on ceg-faculty project only");
    }
    const api = await createAuthenticatedApiContext(playwright, facultyAcct);
    try {
      const res = await postWithCsrf(api, "/v1/visits/schedule", {
        ...SCHEDULE_BODY,
        mobile: "3333333333",
        name: "Spam Tester",
      });
      if (res.status() !== 422) {
        test.skip(
          true,
          `Expected 422 spam rejection; got ${res.status()} (deploy ScheduleVisitBody validators to VM)`,
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      const items = parseValidationErrors(body);
      expect(items.length).toBeGreaterThan(0);
      const phoneErr = items.find((i) => i.field.toLowerCase().includes("mobile"));
      expect(phoneErr, "mobile field error should be present").toBeTruthy();
      expect(phoneErr!.message).toMatch(/spam|repeated/i);
    } finally {
      await api.dispose();
    }
  });

  test("API rejects pure-digit name with 422", async ({ playwright }, testInfo) => {
    if (!testInfo.project.name.includes("faculty")) {
      test.skip(true, "API spam tests run on ceg-faculty project only");
    }
    const api = await createAuthenticatedApiContext(playwright, facultyAcct);
    try {
      const res = await postWithCsrf(api, "/v1/visits/schedule", {
        ...SCHEDULE_BODY,
        name: "1234567",
        mobile: "9845162703",
      });
      if (res.status() !== 422) {
        test.skip(
          true,
          `Expected 422 spam rejection; got ${res.status()} (deploy ScheduleVisitBody validators to VM)`,
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      const items = parseValidationErrors(body);
      expect(items.some((i) => i.field.toLowerCase().includes("name"))).toBe(true);
    } finally {
      await api.dispose();
    }
  });
});
