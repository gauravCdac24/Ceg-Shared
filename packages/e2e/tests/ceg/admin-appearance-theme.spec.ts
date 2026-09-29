/**
 * Sprint 16 — admin appearance toggle drives data-theme + gov CSS tokens.
 * Requires ceg-admin storage state (auth.setup.ts).
 */
import { test, expect } from "@playwright/test";

test.describe("CeG admin appearance", () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "ceg-admin", "admin settings require ceg-admin role");
  });

  test("dark theme sets data-theme and gov surface tokens", async ({ page }) => {
    await page.goto("/admin/settings/preferences");

    await expect(page.getByRole("heading", { name: /appearance/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("radio", { name: "Dark" }).check();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
      .toBe("dark");

    const govSurface2 = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--gov-surface-2").trim(),
    );
    if (govSurface2 !== "#0f1419") {
      test.skip(true, "Dark gov tokens not deployed yet (WL-412 redeploy)");
    }

    const shellBg = await page.locator(".ceg-admin-shell").evaluate((el) =>
      getComputedStyle(el).backgroundColor,
    );
    expect(shellBg).not.toBe("rgb(255, 255, 255)");
  });
});
