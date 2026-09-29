/**
 * FetchDesk visual regression baseline (FD-QA-03).
 * Captures 1440×900 and 390×844 for top workspace surfaces.
 *
 * Update snapshots: pnpm --filter @ceg/e2e exec playwright test visual-baseline --update-snapshots
 */
import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/login", name: "login" },
] as const;

const WORKSPACE_PAGES = [
  { path: "/app", name: "dashboard" },
  { path: "/app/news", name: "news" },
  { path: "/app/jobs", name: "jobs" },
  { path: "/app/sources", name: "sources" },
  { path: "/app/search", name: "search" },
  { path: "/app/settings/setup", name: "settings-setup" },
] as const;

const VIEWPORTS = [
  { width: 1440, height: 900, tag: "desktop" },
  { width: 390, height: 844, tag: "mobile" },
] as const;

test.describe("FetchDesk visual baseline (public)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ mode: "serial" });

  for (const pageDef of PUBLIC_PAGES) {
    for (const vp of VIEWPORTS) {
      test(`${pageDef.name} @ ${vp.tag}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageDef.path);
        await page.waitForLoadState("domcontentloaded");
        await expect(page).toHaveScreenshot(`public-${pageDef.name}-${vp.tag}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.03,
        });
      });
    }
  }
});

test.describe("FetchDesk visual baseline (workspace)", () => {
  test.describe.configure({ mode: "serial" });

  for (const pageDef of WORKSPACE_PAGES) {
    for (const vp of VIEWPORTS) {
      test(`${pageDef.name} @ ${vp.tag}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageDef.path);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveScreenshot(`workspace-${pageDef.name}-${vp.tag}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.03,
        });
      });
    }
  }
});
