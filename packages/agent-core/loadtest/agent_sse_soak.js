// k6 soak: concurrent SSE agent streams (Sprint-6 #60).
// Staging: CERT_STUDIO_LOADTEST_BASE_URL + CERT_STUDIO_LOADTEST_COOKIE
// Local mock: leave BASE_URL empty → script exits 0 with guidance.
//
// Expectation: at high VUs, backend returns "Server busy" / 409 queue-mode /
// rate-limit — not silent 5xx hangs. Thresholds treat busy as acceptable.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || __ENV.CERT_STUDIO_LOADTEST_BASE_URL || '').replace(/\/$/, '');
const COOKIE = __ENV.CERT_STUDIO_LOADTEST_COOKIE || __ENV.COOKIE || '';
const CSRF = __ENV.CERT_STUDIO_LOADTEST_CSRF || __ENV.CSRF || '';
const TARGET_VUS = Number(__ENV.SSE_VUS || 12);
const HOLD = __ENV.SSE_HOLD || '45s';

const busyOk = new Counter('agent_busy_expected');
const streamOk = new Counter('agent_stream_ok');
const unexpectedFail = new Rate('agent_unexpected_fail');

export const options = {
  scenarios: {
    sse_soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: Math.min(4, TARGET_VUS) },
        { duration: HOLD, target: TARGET_VUS },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    agent_unexpected_fail: ['rate<0.15'],
    http_req_duration: ['p(95)<120000'],
  },
};

export function setup() {
  if (!BASE_URL) {
    console.log(
      'BASE_URL unset — skipping live SSE soak (set CERT_STUDIO_LOADTEST_BASE_URL). ' +
        'Unit soak: packages/agent-core/tests/test_turn_semaphore_soak.py'
    );
    return { skip: true };
  }
  return { skip: false };
}

export default function (data) {
  if (data && data.skip) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (COOKIE) headers.Cookie = COOKIE;
  if (CSRF) headers['X-CSRF-Token'] = CSRF;

  // Prefer queue-mode job create; fall back to sync stream for local.
  const jobRes = http.post(
    `${BASE_URL}/v1/agent/jobs`,
    JSON.stringify({
      prompt: 'What is a certificate template placeholder?',
      mode: 'agent',
      context: {},
    }),
    { headers, timeout: '30s' }
  );

  if (jobRes.status === 401 || jobRes.status === 403) {
    unexpectedFail.add(1);
    check(jobRes, { 'auth configured': () => false });
    sleep(1);
    return;
  }

  if (jobRes.status === 409 || jobRes.status === 429 || jobRes.status === 503) {
    busyOk.add(1);
    unexpectedFail.add(0);
    check(jobRes, { 'busy/queue expected under load': (r) => r.status >= 400 });
    sleep(0.5);
    return;
  }

  if (jobRes.status === 200 || jobRes.status === 202) {
    streamOk.add(1);
    unexpectedFail.add(0);
    check(jobRes, { 'job accepted': (r) => r.status === 200 || r.status === 202 });
    sleep(1);
    return;
  }

  // Sync SSE fallback
  const streamRes = http.post(
    `${BASE_URL}/v1/agent/stream`,
    JSON.stringify({
      prompt: 'hello',
      mode: 'agent',
      context: {},
    }),
    { headers, timeout: '60s' }
  );

  const body = String(streamRes.body || '');
  const busy =
    streamRes.status === 429 ||
    streamRes.status === 503 ||
    body.includes('Server busy') ||
    body.includes('Rate limit') ||
    body.includes('already in progress');

  if (busy) {
    busyOk.add(1);
    unexpectedFail.add(0);
  } else if (streamRes.status === 200) {
    streamOk.add(1);
    unexpectedFail.add(0);
  } else if (streamRes.status === 401 || streamRes.status === 403) {
    unexpectedFail.add(1);
  } else if (streamRes.status >= 500) {
    unexpectedFail.add(1);
  } else {
    unexpectedFail.add(0);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const busy = (data.metrics.agent_busy_expected && data.metrics.agent_busy_expected.values.count) || 0;
  const ok = (data.metrics.agent_stream_ok && data.metrics.agent_stream_ok.values.count) || 0;
  const summary = {
    sprint6_load: {
      busy_expected: busy,
      stream_ok: ok,
      note: 'busy_expected > 0 under high VUs means semaphore/queue/rate-limit engaged',
    },
  };
  console.log(JSON.stringify(summary));
  return {
    stdout: JSON.stringify(summary, null, 2),
  };
}
