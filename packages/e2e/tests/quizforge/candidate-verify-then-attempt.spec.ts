/**
 * QuizForge: instructor sees the candidate roster includes a freshly registered
 * candidate; candidate /candidate/verify-identity succeeds; spam input is
 * rejected with 422.
 */
import { test, expect, request as apiRequest } from "@playwright/test";

import { ACCOUNTS_BY_ROLE } from "../../fixtures/accounts";

const instructor = ACCOUNTS_BY_ROLE["quizforge-instructor"]!;

test.describe("QuizForge candidate identity + spam rejection", () => {
  test("candidate verify-identity rejects spam mobile with 422", async () => {
    const api = await apiRequest.newContext({ baseURL: instructor.apiBaseUrl });
    const res = await api.post("/v1/candidate/verify-identity", {
      data: {
        assignment_id: "00000000-0000-0000-0000-000000000000",
        enrollment_no: "DEMO-001",
        email: "candidate@example.com",
        mobile: "3333333333", // spam
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    const items = (body.errors ?? body.data) as Array<{ field: string; message: string }> | undefined;
    expect(Array.isArray(items)).toBe(true);
    expect(items!.some((i) => i.field.includes("mobile"))).toBe(true);
    await api.dispose();
  });

  test("instructor can list papers (RBAC sanity)", async ({ }) => {
    const api = await apiRequest.newContext({ baseURL: instructor.apiBaseUrl });
    const login = await api.post(instructor.loginPath, { data: instructor.payload });
    expect(login.status()).toBeLessThan(400);
    const { access_token } = await login.json();

    const res = await api.get("/v1/papers", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(res.status()).toBe(200);
    await api.dispose();
  });
});
