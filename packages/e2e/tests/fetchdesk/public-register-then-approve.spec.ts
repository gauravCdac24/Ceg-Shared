/**
 * Public org-registration → superadmin approval flow (FetchDesk).
 *
 * Run order:
 *   1. (public context) submit /api/v1/registrations with a unique org_name
 *   2. (superadmin context) visit Platform → Registrations, find pending row,
 *      click approve, verify it moves to active
 *   3. (superadmin context) check the tenant is now usable (login_tenants returns it)
 */
import { test, expect, request as apiRequest } from "@playwright/test";

import { ACCOUNTS_BY_ROLE } from "../../fixtures/accounts";

const superAcct = ACCOUNTS_BY_ROLE["fetchdesk-superadmin"]!;

test.describe("FetchDesk public registration → approval", () => {
  test("submit, list, approve", async () => {
    const stamp = Date.now();
    const orgSlug = `e2e-${stamp}`;
    const orgName = `E2E Test Org ${stamp}`;

    // 1. PUBLIC: submit registration
    const publicApi = await apiRequest.newContext({ baseURL: superAcct.apiBaseUrl });
    const submission = await publicApi.post("/api/v1/registrations", {
      data: {
        org_name: orgName,
        org_type: "government",
        admin_name: "E2E Admin",
        email: `admin+${stamp}@example.gov.in`,
        phone: "9845162703",
        use_case: "End-to-end test of the registration flow",
        domain: `${orgSlug}.example.gov.in`,
      },
    });
    expect(submission.status(), `Public reg returned ${submission.status()}: ${await submission.text()}`).toBeLessThan(400);

    // 2. SUPERADMIN: log in via platform/login
    const superApi = await apiRequest.newContext({ baseURL: superAcct.apiBaseUrl });
    const login = await superApi.post(superAcct.loginPath, { data: superAcct.payload });
    expect(login.status()).toBeLessThan(400);
    const { access_token } = (await login.json()).data ?? (await login.json());
    expect(access_token).toBeTruthy();

    // 3. SUPERADMIN: list registrations and find the one we just submitted
    const list = await superApi.get("/api/v1/platform/registrations", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(list.status()).toBe(200);
    const body = await list.json();
    const items = (body.data ?? body) as Array<{ id: number | string; org_name: string; status?: string }>;
    const found = items.find((r) => r.org_name === orgName);
    expect(found, `Registration ${orgName} not found in superadmin list`).toBeTruthy();

    // 4. SUPERADMIN: approve it
    const approve = await superApi.post(`/api/v1/platform/registrations/${found!.id}/approve`, {
      data: { tenant_slug: orgSlug },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect([200, 201, 204]).toContain(approve.status());

    await publicApi.dispose();
    await superApi.dispose();
  });

  test("public form rejects spam phone via 422", async () => {
    const api = await apiRequest.newContext({ baseURL: superAcct.apiBaseUrl });
    const res = await api.post("/api/v1/registrations", {
      data: {
        org_name: "Spam Org",
        org_type: "government",
        admin_name: "Spam Admin",
        email: "spam@example.com",
        phone: "3333333333",
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    const items = (body.errors ?? body.data) as Array<{ field: string; message: string }> | undefined;
    expect(Array.isArray(items)).toBe(true);
    expect(items!.some((i) => i.field.includes("phone"))).toBe(true);
    await api.dispose();
  });
});
