import { defineConfig, devices } from "@playwright/test";

/**
 * Per-role Playwright config. Each `project` reuses a pre-saved storageState
 * (./auth/<role>.json) so we don't burn time logging in for every test.
 *
 * Generate the storage states before running the suite:
 *   pnpm --filter @ceg/e2e exec playwright test auth.setup.ts
 *
 * Driving env vars (set in CI):
 *   CEG_BASE_URL           default http://127.0.0.1:5174
 *   WORKSHOPOS_BASE_URL    default http://127.0.0.1:5180
 *   QUIZFORGE_BASE_URL     default http://127.0.0.1:8025
 *   CERT_STUDIO_BASE_URL   default http://127.0.0.1:5175
 *   FETCHDESK_BASE_URL     default http://127.0.0.1:5190
 */
const CEG = process.env.CEG_BASE_URL ?? "http://127.0.0.1:5174";
const WS = process.env.WORKSHOPOS_BASE_URL ?? "http://127.0.0.1:5180";
const QF = process.env.QUIZFORGE_BASE_URL ?? "http://127.0.0.1:8025";
const CS = process.env.CERT_STUDIO_BASE_URL ?? "http://127.0.0.1:5175";
const FD = process.env.FETCHDESK_BASE_URL ?? "http://127.0.0.1:5190";

const isRemoteStaging = [CEG, WS, QF, CS, FD].some((u) => /delhi\.cdac\.in/i.test(u));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : isRemoteStaging ? 1 : 0,
  workers: process.env.CI ? 2 : isRemoteStaging ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Setup project creates storage states for every role.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ceg-visitor",
      use: { ...devices["Desktop Chrome"], baseURL: CEG, storageState: "auth/ceg-visitor.json" },
      dependencies: ["setup"],
      testMatch: /tests\/ceg\/.+\.spec\.ts/,
    },
    {
      name: "ceg-faculty",
      use: { ...devices["Desktop Chrome"], baseURL: CEG, storageState: "auth/ceg-faculty.json" },
      dependencies: ["setup"],
      testMatch: /tests\/ceg\/.+\.spec\.ts/,
    },
    {
      name: "ceg-admin",
      use: { ...devices["Desktop Chrome"], baseURL: CEG, storageState: "auth/ceg-admin.json" },
      dependencies: ["setup"],
      testMatch: /tests\/ceg\/.+\.spec\.ts/,
    },
    {
      name: "ceg-superadmin",
      use: { ...devices["Desktop Chrome"], baseURL: CEG, storageState: "auth/ceg-superadmin.json" },
      dependencies: ["setup"],
      testMatch: /tests\/ceg\/.+\.spec\.ts/,
    },
    {
      name: "workshopos-tenant-admin",
      use: { ...devices["Desktop Chrome"], baseURL: WS, storageState: "auth/workshopos-tenant-admin.json" },
      dependencies: ["setup"],
      testMatch: /tests\/workshopos\/.+\.spec\.ts/,
      testIgnore: /tenant-booking-visit\.spec\.ts/,
    },
    {
      name: "workshopos-public",
      use: { ...devices["Desktop Chrome"], baseURL: WS },
      testMatch: /tests\/workshopos\/tenant-booking-visit\.spec\.ts/,
    },
    {
      name: "quizforge-instructor",
      use: { ...devices["Desktop Chrome"], baseURL: QF, storageState: "auth/quizforge-instructor.json" },
      dependencies: ["setup"],
      testMatch: /tests\/quizforge\/.+\.spec\.ts/,
    },
    {
      name: "cert-studio-superadmin",
      use: { ...devices["Desktop Chrome"], baseURL: CS, storageState: "auth/cert-studio-superadmin.json" },
      dependencies: ["setup"],
      testMatch: /tests\/cert-studio\/.+\.spec\.ts/,
    },
    {
      name: "fetchdesk-superadmin",
      use: { ...devices["Desktop Chrome"], baseURL: FD, storageState: "auth/fetchdesk-superadmin.json" },
      dependencies: ["setup"],
      testMatch: /tests\/fetchdesk\/.+\.spec\.ts/,
    },
    {
      name: "fetchdesk-org-admin",
      use: { ...devices["Desktop Chrome"], baseURL: FD, storageState: "auth/fetchdesk-org-admin.json" },
      dependencies: ["setup"],
      testMatch: /tests\/fetchdesk\/.+\.spec\.ts/,
    },
    // Unauthenticated project for public registration / public lookup flows.
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /tests\/public\/.+\.spec\.ts/,
    },
  ],
});
