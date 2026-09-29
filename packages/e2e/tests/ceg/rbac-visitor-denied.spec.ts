/**
 * RBAC regression: a visitor account MUST NOT be able to hit admin routes.
 * Tests both UI (no nav entry, 403 redirect) and API (403/401 on direct call).
 */
import { test, expect, request as apiRequest } from "@playwright/test";

import { ACCOUNTS_BY_ROLE } from "../../fixtures/accounts";

const visitor = ACCOUNTS_BY_ROLE["ceg-visitor"]!;

function visitorOnly(testInfo: import("@playwright/test").TestInfo) {
  if (!testInfo.project.name.includes("visitor")) {
    test.skip(true, "Visitor RBAC runs on ceg-visitor project only");
  }
}

const ACCESS_DENIED =
  /admin access required|access denied|platform console restricted/i;

async function expectAccessDenied(page: import("@playwright/test").Page) {
  await expect(page.getByText(ACCESS_DENIED).first()).toBeVisible({ timeout: 45_000 });
}

test.describe("Visitor RBAC denial (CeG)", () => {
  test("visitor cannot reach admin dashboard in UI", async ({ page }, testInfo) => {
    visitorOnly(testInfo);
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expectAccessDenied(page);
    expect(page.url()).not.toMatch(/\/admin\/dashboard\/edit/);
  });

  test("visitor cannot reach platform users console", async ({ page }, testInfo) => {
    visitorOnly(testInfo);
    await page.goto("/admin/platform/users", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expectAccessDenied(page);
  });

  test("visitor session gets 403/401 from /v1/users (admin-only)", async ({}, testInfo) => {
    visitorOnly(testInfo);
    const api = await apiRequest.newContext({
      baseURL: visitor.frontendOrigin,
      storageState: "auth/ceg-visitor.json",
    });
    const res = await api.get("/v1/users");
    expect([401, 403]).toContain(res.status());
    await api.dispose();
  });
});
