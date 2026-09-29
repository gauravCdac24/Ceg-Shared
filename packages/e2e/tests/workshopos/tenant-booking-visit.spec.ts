import { test, expect } from "@playwright/test";

test.describe("WorkshopOS tenant registration and booking", () => {
  test.skip(!process.env.WORKSHOPOS_BASE_URL, "WORKSHOPOS_BASE_URL not configured");

  test("public registration page loads", async ({ page }) => {
    const base = process.env.WORKSHOPOS_BASE_URL!;
    await page.goto(`${base}/register-tenant`);
    await expect(page.getByText(/Register your organisation/i)).toBeVisible();
  });

  test("events list is reachable", async ({ page }) => {
    const base = process.env.WORKSHOPOS_BASE_URL!;
    await page.goto(`${base}/events`);
    await expect(page.locator("body")).toBeVisible();
  });
});
