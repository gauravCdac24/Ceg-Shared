/**
 * E2E account inventory — mirrors `demo-docs/DEMO_CREDENTIALS.md` and
 * `tests/smoke/demo_credentials.py`. Update all three together when adding
 * accounts.
 */

const ENV = process.env;
const CEG_API = ENV.CEG_API_BASE_URL ?? "http://127.0.0.1:8015";
const WS_API = ENV.WORKSHOPOS_API_BASE_URL ?? "http://127.0.0.1:8070";
const QF_API = ENV.QUIZFORGE_API_BASE_URL ?? "http://127.0.0.1:8050";
const CS_API = ENV.CERT_STUDIO_API_BASE_URL ?? "http://127.0.0.1:8040";
const FD_API = ENV.FETCHDESK_API_BASE_URL ?? "http://127.0.0.1:8060";

const CEG_FE = ENV.CEG_BASE_URL ?? "http://127.0.0.1:5174";
const WS_FE = ENV.WORKSHOPOS_BASE_URL ?? "http://127.0.0.1:5180";
const QF_FE = ENV.QUIZFORGE_BASE_URL ?? "http://127.0.0.1:8025";
const CS_FE = ENV.CERT_STUDIO_BASE_URL ?? "http://127.0.0.1:5175";

/** When FE is mounted under /cert (staging), API + login paths include the mount prefix. */
function certStudioEndpoints(frontendOrigin: string, apiDefault: string): {
  apiBaseUrl: string;
  loginPath: string;
} {
  const trimmed = frontendOrigin.replace(/\/$/, "");
  try {
    const mount = new URL(trimmed).pathname.replace(/\/$/, "");
    if (mount && mount !== "/") {
      return {
        apiBaseUrl: `${trimmed}/api/v1`,
        loginPath: `${mount}/api/v1/auth/login`,
      };
    }
  } catch {
    /* use defaults */
  }
  return { apiBaseUrl: apiDefault, loginPath: "/api/v1/auth/login" };
}

const CS_ENDPOINTS = certStudioEndpoints(CS_FE, CS_API);
const FD_FE = ENV.FETCHDESK_BASE_URL ?? "http://127.0.0.1:5190";

export type Account = {
  product: "ceg" | "workshopos" | "quizforge" | "cert_studio" | "fetchdesk";
  role: string;
  storageKey: string;
  email: string;
  password: string;
  apiBaseUrl: string;
  frontendOrigin: string;
  loginPath: string;
  payload: Record<string, unknown>;
};

export const ACCOUNTS: Account[] = [
  {
    product: "ceg",
    role: "visitor",
    storageKey: "ceg-visitor",
    email: "visitor@cdac.in",
    password: "Changeme123!",
    apiBaseUrl: CEG_API,
    frontendOrigin: CEG_FE,
    loginPath: "/v1/auth/login",
    payload: { email: "visitor@cdac.in", password: "Changeme123!" },
  },
  {
    product: "ceg",
    role: "faculty",
    storageKey: "ceg-faculty",
    email: "faculty@cdac.in",
    password: "Changeme123!",
    apiBaseUrl: CEG_API,
    frontendOrigin: CEG_FE,
    loginPath: "/v1/auth/login",
    payload: { email: "faculty@cdac.in", password: "Changeme123!" },
  },
  {
    product: "ceg",
    role: "admin",
    storageKey: "ceg-admin",
    email: "admin@ceg.gov.in",
    password: "CeG@admin2024",
    apiBaseUrl: CEG_API,
    frontendOrigin: CEG_FE,
    loginPath: "/v1/auth/login",
    payload: { email: "admin@ceg.gov.in", password: "CeG@admin2024" },
  },
  {
    product: "ceg",
    role: "superadmin",
    storageKey: "ceg-superadmin",
    email: "superadmin@ceg.gov.in",
    password: "CeG@admin2024",
    apiBaseUrl: CEG_API,
    frontendOrigin: CEG_FE,
    loginPath: "/v1/auth/login",
    payload: { email: "superadmin@ceg.gov.in", password: "CeG@admin2024" },
  },
  {
    product: "workshopos",
    role: "tenant_admin",
    storageKey: "workshopos-tenant-admin",
    email: "ceg.workshop.admin@cdac.in",
    password: "Changeme123!",
    apiBaseUrl: WS_API,
    frontendOrigin: WS_FE,
    loginPath: "/api/v1/auth/login",
    payload: { email: "ceg.workshop.admin@cdac.in", password: "Changeme123!" },
  },
  {
    product: "quizforge",
    role: "quiz_admin",
    storageKey: "quizforge-instructor",
    email: "quizadmin@rectest.edu",
    password: "QuizAdmin@123",
    apiBaseUrl: QF_API,
    frontendOrigin: QF_FE,
    loginPath: "/v1/auth/login",
    payload: { email: "quizadmin@rectest.edu", password: "QuizAdmin@123" },
  },
  {
    product: "cert_studio",
    role: "tenant_admin",
    storageKey: "cert-studio-superadmin",
    email: "dev@ceg.gov.in",
    password: "devpass123",
    apiBaseUrl: CS_ENDPOINTS.apiBaseUrl,
    frontendOrigin: CS_FE,
    loginPath: CS_ENDPOINTS.loginPath,
    payload: { username: "dev@ceg.gov.in", password: "devpass123" },
  },
  {
    product: "fetchdesk",
    role: "super_admin",
    storageKey: "fetchdesk-superadmin",
    email: "admin@cdac.in",
    password: "admin@1234",
    apiBaseUrl: FD_API,
    frontendOrigin: FD_FE,
    loginPath: "/api/v1/auth/platform/login",
    payload: { email: "admin@cdac.in", password: "admin@1234" },
  },
  {
    product: "fetchdesk",
    role: "org_admin",
    storageKey: "fetchdesk-org-admin",
    email: "demo@fetchdesk.local",
    password: "DemoPass123!",
    apiBaseUrl: FD_API,
    frontendOrigin: FD_FE,
    loginPath: "/api/v1/auth/login",
    payload: { tenant_slug: "demo", employee_id: "admin", password: "DemoPass123!" },
  },
];

export const ACCOUNTS_BY_ROLE: Record<string, Account> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.storageKey, a]),
);
