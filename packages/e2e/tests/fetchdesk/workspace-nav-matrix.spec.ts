/**
 * FetchDesk workspace navigation matrix (FD-QA-01).
 * Happy paths for org-admin shell routes + unauthenticated failure paths.
 *
 * Requires auth storage from: pnpm --filter @ceg/e2e exec playwright test auth.setup.ts
 * Run: pnpm --filter @ceg/e2e test:fetchdesk-org-admin
 */
import { test, expect } from "@playwright/test";

const WORKSPACE_ROUTES: Array<{ path: string; heading: RegExp }> = [
  { path: "/app", heading: /good (morning|afternoon|evening)|welcome|sources/i },
  { path: "/app/news", heading: /news desk|news intelligence/i },
  { path: "/app/jobs", heading: /collections|gather content/i },
  { path: "/app/sources", heading: /sources|websites/i },
  { path: "/app/automation", heading: /automation|auto rules/i },
  { path: "/app/analytics", heading: /insights|analytics/i },
  { path: "/app/trends", heading: /trending|trends/i },
  { path: "/app/search", heading: /search|find articles/i },
  { path: "/app/inbox", heading: /review queue|inbox/i },
  { path: "/app/settings/setup", heading: /workspace readiness|readiness/i },
];

test.describe("FetchDesk workspace nav matrix (org admin)", () => {
  for (const route of WORKSPACE_ROUTES) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("main, [role='main'], .fd-page, body")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(route.heading, {
        timeout: 20_000,
      });
    });
  }

  test("command palette opens with Ctrl+K", async ({ page }) => {
    await page.goto("/app");
    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog").or(page.locator("[cmdk-root]"))).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("FetchDesk workspace nav failure paths", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated /app redirects to login", async ({ page }) => {
    await page.goto("/app/news");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("unknown route shows 404", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-fd-e2e");
    await expect(page.getByText(/404|not found/i)).toBeVisible();
  });
});
