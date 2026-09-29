import type { Playwright } from "@playwright/test";

import type { Account } from "../fixtures/accounts";

type CaptchaChallenge = {
  challenge_id: string;
  question: string;
  token: string;
  enabled?: boolean;
};

function parseCaptchaAnswer(challengeId: string, question: string): string {
  const parts = challengeId.split(":");
  if (parts.length >= 3) {
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return String(a + b);
  }
  const match = question.match(/(\d+)\s*\+\s*(\d+)/);
  if (match) return String(Number(match[1]) + Number(match[2]));
  throw new Error(`Cannot parse captcha answer from ${challengeId} / ${question}`);
}

function captchaGetPath(acct: Account): string | null {
  switch (acct.product) {
    case "ceg":
      return "/v1/auth/captcha";
    case "workshopos":
    case "fetchdesk":
      return "/api/v1/auth/captcha";
    default:
      return null;
  }
}

async function maybeCaptchaFields(
  ctx: Awaited<ReturnType<Playwright["request"]["newContext"]>>,
  acct: Account,
): Promise<Record<string, string>> {
  const path = captchaGetPath(acct);
  if (!path) return {};

  const res = await ctx.get(path);
  if (res.status() >= 400) return {};

  const body = (await res.json()) as { data?: CaptchaChallenge; enabled?: boolean };
  const data = body.data ?? (body as CaptchaChallenge);
  if (!data?.challenge_id || data.enabled === false) return {};

  return {
    captchaChallengeId: data.challenge_id,
    captchaAnswer: parseCaptchaAnswer(data.challenge_id, data.question),
    captchaToken: data.token,
  };
}

/**
 * Login via the frontend origin (so Set-Cookie attaches to the browser host)
 * and persist Playwright storageState with HttpOnly cookies.
 */
export async function loginAndSaveStorageState(
  playwright: Playwright,
  acct: Account,
  statePath: string,
): Promise<void> {
  const maxAttempts = 3;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const ctx = await playwright.request.newContext({ baseURL: acct.frontendOrigin });
    try {
      const captcha = await maybeCaptchaFields(ctx, acct);
      const payload = { ...acct.payload, ...captcha };
      const res = await ctx.post(acct.loginPath, { data: payload });
      if (res.status() >= 400) {
        throw new Error(
          `Login ${acct.product}/${acct.role} returned ${res.status()}: ${await res.text()}`,
        );
      }
      await ctx.storageState({ path: statePath });
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    } finally {
      await ctx.dispose();
    }
  }

  throw lastError ?? new Error(`Login ${acct.product}/${acct.role} failed`);
}
