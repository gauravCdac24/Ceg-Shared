export type IntegrationProductId =
  | 'certstudio'
  | 'quizforge'
  | 'workshopos'
  | 'ceg_portal'
  | 'fetchdesk';

export type DocStep = {
  title: string;
  body: string;
};

export type DocEndpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  /** Logical domain for grouped endpoint trees (auth, templates, jobs, …). */
  group?: string;
};

export type DocEndpointGroupInfo = {
  id: string;
  label: string;
  description: string;
};

export type DocExample = {
  title: string;
  language: 'bash' | 'json' | 'typescript';
  code: string;
};

export type DocFaq = {
  q: string;
  a: string;
};

export type ProductIntegrationDoc = {
  id: IntegrationProductId;
  title: string;
  tagline: string;
  /** Short overview paragraph shown above Get Started. */
  overview?: string;
  /** Operator-facing title when IntegrationHubDocs audience="operator". */
  operatorTitle?: string;
  operatorTagline?: string;
  operatorOverview?: string;
  operatorSetupSteps?: DocStep[];
  integrationPrefix: string;
  authHeader: string;
  authNote: string;
  openApiPath?: string;
  setupSteps: DocStep[];
  endpointGroups?: DocEndpointGroupInfo[];
  endpoints: DocEndpoint[];
  examples: DocExample[];
  webhooks?: { events: string[]; note: string };
  envVars?: { name: string; description: string }[];
  connectsTo?: string[];
  faq: DocFaq[];
};

const COMMON_FAQ: DocFaq[] = [
  {
    q: 'Where do I create an API key?',
    a: 'Use the key management panel on this page (when shown), or your product Settings → API keys / Integrations. The raw secret is shown once — store it in a secrets manager, not in frontend code.',
  },
  {
    q: 'Can I call these APIs from the browser?',
    a: 'No. Integration APIs are server-to-server only. Never embed X-Api-Key in a public SPA or mobile app; proxy through your backend.',
  },
  {
    q: 'How do I rotate a compromised key?',
    a: 'Create a new key, deploy it to your application, verify traffic, then revoke the old key. Most products support multiple active keys during rotation.',
  },
  {
    q: 'What HTTP status should I expect for async jobs?',
    a: 'Bulk certificate jobs return 202 Accepted with a job_id. Poll the job status endpoint until status is COMPLETED, PARTIAL, or FAILED before downloading artifacts.',
  },
];

export const ECOSYSTEM_PRODUCTS: { id: IntegrationProductId; label: string; role: string; operatorLabel?: string; operatorRole?: string }[] = [
  { id: 'ceg_portal', label: 'CeG Portal', role: 'Programme hub — visits, orgs, cross-product orchestration', operatorLabel: 'CeG Portal', operatorRole: 'Programme hub for visits and linked products' },
  { id: 'quizforge', label: 'QuizForge', role: 'Assessments, contests, rosters, embed tokens', operatorLabel: 'Quiz', operatorRole: 'Visit quizzes, contests, and results' },
  { id: 'certstudio', label: 'Cert Studio', role: 'Templates, bulk PDF jobs, verify & wallet URLs', operatorLabel: 'Certificates', operatorRole: 'Certificate designs and issuance' },
  { id: 'workshopos', label: 'WorkshopOS', role: 'Events, bookings, attendance-triggered certificates', operatorLabel: 'Attendance', operatorRole: 'Workshop registration and attendance' },
  { id: 'fetchdesk', label: 'FetchDesk', role: 'News/crawl ingest pushed into CeG approval queue', operatorLabel: 'News feed', operatorRole: 'News crawl into CeG review queues' },
];

export const PRODUCT_DOCS: Record<IntegrationProductId, ProductIntegrationDoc> = {
  certstudio: {
    id: 'certstudio',
    title: 'Cert Studio integration API',
    tagline:
      'Issue verifiable PDF certificates from your LMS, portal, or batch pipeline. Publish templates first, then POST bulk jobs and poll until PDFs are ready.',
    overview:
      'Cert Studio exposes two API surfaces: session-authenticated REST routes for your organisation (templates, jobs, library, settings) and integration routes prefixed with /integrations for server-to-server automation. All integration calls require an X-Api-Key header scoped to your tenant. Never embed keys in browser code — proxy through your backend.',
    integrationPrefix: '/integrations',
    authHeader: 'X-Api-Key',
    authNote:
      'Create a scoped key under Settings → API keys (or POST /integrations/api-keys with an existing integration key). Keys are tenant-scoped; revoked keys return 401 immediately.',
    openApiPath: '/api/v1/openapi.json',
    setupSteps: [
      {
        title: 'Publish a certificate template',
        body: 'Design in Template Gallery, add merge fields like {{recipient_name}}, and set status to Published.',
      },
      {
        title: 'Link template to the integration pool',
        body: 'Only templates linked for integrations can be used via API. Link from template settings or admin library.',
      },
      {
        title: 'Create an integration API key',
        body: 'Settings → API keys → Generate. Minimum scopes: read:templates, write:jobs, read:certs.',
      },
      {
        title: 'Discover merge fields',
        body: 'GET /integrations/platform/templates returns field names per template so your app maps CSV/LMS columns correctly.',
      },
      {
        title: 'Queue a bulk job',
        body: 'POST /integrations/jobs with template_id, rows[], optional source_product and auto_dispatch_email.',
      },
      {
        title: 'Poll and download',
        body: 'GET /integrations/jobs/{job_id} until COMPLETED. Download ZIP or single-row PDF. Store serial numbers for verify links.',
      },
      {
        title: 'Optional: webhooks & verify',
        body: 'Configure Settings → Webhooks for cert.issued / certificate.generated. Public verify at /verify/{serial} needs no API key.',
      },
    ],
    endpointGroups: [
      {
        id: 'auth',
        label: 'Authentication & API keys',
        description: 'Create and revoke tenant-scoped keys. Integration routes accept X-Api-Key; the admin UI uses session cookies.',
      },
      {
        id: 'templates',
        label: 'Templates',
        description: 'Design templates in the gallery, publish them, and discover merge fields before queuing jobs.',
      },
      {
        id: 'jobs',
        label: 'Jobs & certificates',
        description: 'Bulk PDF generation, per-row downloads, and recipient wallet lookups.',
      },
      {
        id: 'library',
        label: 'Certificate library',
        description: 'Search issued certificates, export metadata, and manage revocation from your backend.',
      },
      {
        id: 'ai',
        label: 'AI & OCR',
        description: 'Optional AI-assisted template generation and document OCR (session auth, credit-metered).',
      },
      {
        id: 'settings',
        label: 'Settings & webhooks',
        description: 'Verification branding, webhooks, and org configuration — mostly session-authenticated admin routes.',
      },
    ],
    endpoints: [
      { method: 'GET', path: '/api-keys/', summary: 'List active API keys (session auth)', group: 'auth' },
      { method: 'POST', path: '/api-keys/', summary: 'Create API key — secret shown once (session auth)', group: 'auth' },
      { method: 'DELETE', path: '/api-keys/{key_id}', summary: 'Revoke an API key immediately', group: 'auth' },
      { method: 'POST', path: '/integrations/api-keys', summary: 'Create integration key via existing key', group: 'auth' },
      { method: 'GET', path: '/templates', summary: 'List templates (scope=mine|shared|community)', group: 'templates' },
      { method: 'POST', path: '/templates', summary: 'Create template with canvas JSON', group: 'templates' },
      { method: 'GET', path: '/integrations/platform/templates', summary: 'Published templates + merge-field metadata', group: 'templates' },
      { method: 'GET', path: '/integrations/templates', summary: 'Template picker for integrations', group: 'templates' },
      { method: 'POST', path: '/jobs', summary: 'Queue bulk job from UI/automation (session or key)', group: 'jobs' },
      { method: 'GET', path: '/jobs/{job_id}', summary: 'Job status and progress', group: 'jobs' },
      { method: 'POST', path: '/integrations/jobs', summary: 'Queue bulk generation (202 + job_id)', group: 'jobs' },
      { method: 'GET', path: '/integrations/jobs/{job_id}', summary: 'Integration job status + download_url', group: 'jobs' },
      { method: 'GET', path: '/integrations/jobs/{job_id}/download', summary: 'ZIP of PDFs + row metadata JSON', group: 'jobs' },
      { method: 'GET', path: '/integrations/jobs/{job_id}/rows/{n}/download', summary: 'Single-row PDF download', group: 'jobs' },
      { method: 'GET', path: '/integrations/platform/recipient-certs', summary: 'Wallet list for recipient email', group: 'jobs' },
      { method: 'GET', path: '/library', summary: 'Paginated issued certificate registry', group: 'library' },
      { method: 'GET', path: '/library/{serial}', summary: 'Single certificate record by serial', group: 'library' },
      { method: 'POST', path: '/templates/ai-generate', summary: 'AI template draft from prompt (credits)', group: 'ai' },
      { method: 'POST', path: '/ocr/extract', summary: 'OCR upload → text blocks for editor', group: 'ai' },
      { method: 'GET', path: '/settings/verification', summary: 'Public verify page settings', group: 'settings' },
      { method: 'PUT', path: '/settings/verification', summary: 'Update verification URL and flags', group: 'settings' },
      { method: 'GET', path: '/settings/ai-provider', summary: 'BYO AI provider configuration', group: 'settings' },
      { method: 'GET', path: '/webhooks', summary: 'List outbound webhook endpoints', group: 'settings' },
      { method: 'POST', path: '/integrations/verify', summary: 'Server-side verify by serial', group: 'settings' },
      { method: 'GET', path: '/verify/{serial}', summary: 'Public verify (no API key)', group: 'settings' },
    ],
    examples: [
      {
        title: 'List templates with fields',
        language: 'bash',
        code: `curl -s "{{base}}/integrations/platform/templates" \\
  -H "X-Api-Key: YOUR_API_KEY"`,
      },
      {
        title: 'Queue a bulk job',
        language: 'bash',
        code: `curl -s -X POST "{{base}}/integrations/jobs" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "TEMPLATE_UUID",
    "source_product": "my_lms",
    "auto_dispatch_email": true,
    "rows": [
      {
        "recipient_name": "Ada Lovelace",
        "recipient_email": "ada@example.edu",
        "custom_fields": { "course": "Python 101" }
      }
    ]
  }'`,
      },
      {
        title: 'Poll job status',
        language: 'bash',
        code: `curl -s "{{base}}/integrations/jobs/JOB_UUID" \\
  -H "X-Api-Key: YOUR_API_KEY"`,
      },
      {
        title: 'TypeScript SDK (@ceg/cert-integration)',
        language: 'typescript',
        code: `import { CertStudioClient } from '@ceg/cert-integration'

const client = new CertStudioClient('{{origin}}', process.env.CERT_STUDIO_API_KEY!)
const { jobId } = await client.createJob({
  templateId: 'TEMPLATE_UUID',
  rows: [{ recipient_name: 'Ada Lovelace', recipient_email: 'ada@example.edu' }],
  sourceProduct: 'my_lms',
  autoDispatchEmail: true,
})
const status = await client.getJobStatus(jobId)`,
      },
    ],
    webhooks: {
      events: ['cert.issued', 'certificate.generated', 'bulk.completed', 'certificate.verified', 'certificate.revoked'],
      note: 'Configure HTTPS endpoints under Settings → Webhooks. Payloads include job_id, serial_number, and verify_url when applicable.',
    },
    envVars: [
      { name: 'CERT_STUDIO_API_KEY', description: 'Server-side integration key for your LMS, portal, or automation backend' },
      { name: 'CERT_STUDIO_BASE_URL', description: 'Public base URL of cert-studio-backend (include scheme, no trailing slash)' },
    ],
    connectsTo: ['quizforge', 'workshopos'],
    faq: [
      ...COMMON_FAQ,
      {
        q: 'Why do I get 403 “Template is not linked to the integration pool”?',
        a: 'The template is published but not enabled for external API jobs. Link it in template admin or re-publish from the integration-enabled pool.',
      },
      {
        q: 'What is blockchain_proof / integrity anchoring?',
        a: 'When enabled under Verification settings, new certs get a registry SHA-256 digest (ceg-stub:…). This is tamper-evident metadata, not an on-chain Polygon transaction.',
      },
      {
        q: 'Can I verify without an API key?',
        a: 'Yes. Public GET /api/v1/verify/{serial} and wallet /c/{serial} are unauthenticated. Use integration verify only from trusted backends.',
      },
    ],
  },
  quizforge: {
    id: 'quizforge',
    title: 'QuizForge integration API',
    tagline:
      'Create assignments from presets, sync rosters, embed quizzes in your portal, and pull results — all with tenant-scoped API keys.',
    integrationPrefix: '/integrations',
    authHeader: 'X-Api-Key',
    authNote:
      'Keys are created under Settings → Integrations (prefix qf_…). Each key is bound to your QuizForge tenant — CeG Portal is one tenant among many.',
    openApiPath: '/v1/openapi.json',
    setupSteps: [
      {
        title: 'Create an integration key',
        body: 'Settings → Integrations → Create key. Label it (e.g. “My university portal”). Copy the secret immediately.',
      },
      {
        title: 'List question paper presets',
        body: 'GET /integrations/question-paper-presets — pick a preset_id that matches your exam blueprint.',
      },
      {
        title: 'Create an assignment',
        body: 'POST /integrations/assignments/from-preset with roster[], schedule, proctoring, and optional external_visit_id for CeG/WorkshopOS correlation.',
      },
      {
        title: 'Sync or extend roster',
        body: 'POST /integrations/assignments/{id}/roster to add candidates after creation.',
      },
      {
        title: 'Embed in your app',
        body: 'POST /integrations/embed-token → open candidate UI with token. Or direct candidates to /quiz?assignment_id=…',
      },
      {
        title: 'Fetch results',
        body: 'GET /integrations/assignments/{id}/results when the session ends. Use analytics endpoints for rankings if enabled.',
      },
      {
        title: 'Optional: Cert Studio pass certificates',
        body: 'Configure Cert Studio in assignment cert settings; QuizForge calls Cert Studio when pass threshold is met.',
      },
    ],
    endpoints: [
      { method: 'GET', path: '/integrations/question-paper-presets', summary: 'Exam presets available to integrations' },
      { method: 'POST', path: '/integrations/assignments/from-preset', summary: 'Create assignment from preset + roster' },
      { method: 'POST', path: '/integrations/assignments', summary: 'Create from paper_id' },
      { method: 'PATCH', path: '/integrations/assignments/{id}', summary: 'Update title, threshold, proctoring, UI theme' },
      { method: 'POST', path: '/integrations/assignments/{id}/roster', summary: 'Add/update roster entries' },
      { method: 'POST', path: '/integrations/embed-token', summary: 'Short-lived embed token for iframe/deep link' },
      { method: 'GET', path: '/integrations/assignments/{id}/results', summary: 'Scores and attempt summary' },
      { method: 'POST', path: '/integrations/assignments/{id}/end', summary: 'Force-end live session' },
      { method: 'GET', path: '/integrations/tenant', summary: 'Tenant metadata for your key' },
      { method: 'GET', path: '/integrations/analytics/student-rankings', summary: 'Rankings export (when enabled)' },
    ],
    examples: [
      {
        title: 'Create assignment from preset',
        language: 'bash',
        code: `curl -s -X POST "{{base}}/integrations/assignments/from-preset" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "preset_id": "PRESET_UUID",
    "title": "Mid-term — Batch A",
    "external_visit_id": "visit-123",
    "roster": [
      { "name": "Ada Lovelace", "email": "ada@example.edu", "enrollment_no": "EN001" }
    ],
    "pass_threshold": 40
  }'`,
      },
      {
        title: 'Get embed token',
        language: 'bash',
        code: `curl -s -X POST "{{base}}/integrations/embed-token" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "assignment_id": "ASSIGNMENT_UUID", "candidate_email": "ada@example.edu" }'`,
      },
    ],
    envVars: [
      { name: 'QUIZFORGE_API_KEY', description: 'Server-side key for CeG / WorkshopOS backends' },
      { name: 'QUIZFORGE_API_BASE', description: 'QuizForge API origin (e.g. https://host/quiz or https://host with /v1 paths)' },
    ],
    connectsTo: ['ceg_portal', 'workshopos', 'certstudio'],
    faq: [
      ...COMMON_FAQ,
      {
        q: 'What is external_visit_id?',
        a: 'Optional correlation ID linking a QuizForge assignment to a CeG visit or WorkshopOS event. Use the same ID across products for traceability in platform audit logs.',
      },
      {
        q: 'Platform routes (/integrations/platform/*) vs tenant routes?',
        a: 'Tenant routes manage your org’s quizzes. Platform routes (tenant suspend, cross-tenant stats) are called only from CeG Portal super-admin with a platform key — not from this tenant UI.',
      },
      {
        q: 'How do candidates access without API?',
        a: 'Share org portal URL (/quiz/org/{slug}) or assignment links. API keys are never given to candidates.',
      },
    ],
  },
  workshopos: {
    id: 'workshopos',
    title: 'WorkshopOS integrations',
    tagline:
      'WorkshopOS connects outbound to QuizForge and Cert Studio. Configure server env vars, then use Admin → Integrations to test and enable auto-certificates on bookings or attendance.',
    integrationPrefix: '/tenant/integrations',
    authHeader: 'Authorization: Bearer',
    authNote:
      'Tenant UI routes use your staff JWT (cookie/session). External systems should integrate with Cert Studio and QuizForge APIs directly — WorkshopOS orchestrates via server-side clients.',
    setupSteps: [
      {
        title: 'Set server environment variables',
        body: 'On workshopos-backend: CERT_STUDIO_API_KEY, CERT_STUDIO_BASE_URL, QUIZFORGE_API_KEY, QUIZFORGE_API_BASE. Run seed scripts if pairing with CeG dev stack.',
      },
      {
        title: 'Test connectivity',
        body: 'Admin → Integrations → Test connection for Quizzes and Certificates. Fix 401/503 before enabling automation.',
      },
      {
        title: 'Load certificate templates',
        body: 'Load templates lists published Cert Studio designs available to this tenant.',
      },
      {
        title: 'Enable certificate issuance',
        body: 'Pick default template, trigger (booking confirmed vs attendance marked), and optional auto-email.',
      },
      {
        title: 'Map participant fields',
        body: 'Ensure booking roster names/emails match Cert Studio merge fields (recipient_name, recipient_email).',
      },
      {
        title: 'Monitor jobs',
        body: 'Certificate jobs appear in Admin → Certificates. Failures often mean template not linked or API key mismatch.',
      },
    ],
    endpoints: [
      { method: 'POST', path: '/integrations/test-quizforge', summary: 'Staff JWT — connectivity ping to QuizForge' },
      { method: 'POST', path: '/integrations/test-cert-studio', summary: 'Staff JWT — connectivity ping to Cert Studio' },
      { method: 'GET', path: '/tenant/integrations/cert-studio/templates', summary: 'Template picker data (proxied)' },
      { method: 'GET', path: '/tenant/integrations/cert-studio/settings', summary: 'Current cert automation settings' },
      { method: 'PATCH', path: '/tenant/integrations/cert-studio/settings', summary: 'Enable template, trigger, auto-email' },
    ],
    examples: [
      {
        title: 'Cert automation settings (staff session)',
        language: 'bash',
        code: `curl -s -X PATCH "{{base}}/tenant/integrations/cert-studio/settings" \\
  -H "Authorization: Bearer STAFF_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cert_integration_enabled": true,
    "cert_template_id": "TEMPLATE_UUID",
    "cert_trigger": "attendance_marked",
    "cert_auto_email": true
  }'`,
      },
    ],
    envVars: [
      { name: 'CERT_STUDIO_API_KEY', description: 'Must match a Cert Studio integration key for the same org tenant' },
      { name: 'CERT_STUDIO_BASE_URL', description: 'Cert Studio API origin' },
      { name: 'QUIZFORGE_API_KEY', description: 'QuizForge integration key for event quizzes' },
      { name: 'QUIZFORGE_API_BASE', description: 'QuizForge API origin' },
    ],
    connectsTo: ['certstudio', 'quizforge', 'ceg_portal'],
    faq: [
      {
        q: 'Does WorkshopOS expose a public X-Api-Key API for my LMS?',
        a: 'Not for certificate bulk jobs. Point your LMS at Cert Studio /integrations directly, or use CeG Portal visit flows. WorkshopOS consumes those services on your behalf when automation is enabled.',
      },
      {
        q: 'Booking confirmed vs attendance marked?',
        a: 'booking_confirmed fires when payment/status confirms. attendance_marked fires after OTP/QR/manual attendance — better for workshops where presence matters.',
      },
      ...COMMON_FAQ.slice(1),
    ],
  },
  ceg_portal: {
    id: 'ceg_portal',
    title: 'CeG Portal integration hub',
    tagline:
      'CeG orchestrates visits, quizzes, workshops, and certificates. Super-admin platform keys call downstream products; inbound webhooks receive FetchDesk news and Cert Studio events.',
    operatorTitle: 'How products connect',
    operatorTagline:
      'CeG Portal links visits with Quiz, Attendance, Certificates, and News feed. Day-to-day operators use Product keys and health screens — technical API details are under For developers.',
    operatorOverview:
      'Ask platform operations to connect each product once. After that, use Visit requests, Quiz, Certificates, and News & Events as usual. You do not need API keys in the browser.',
    operatorSetupSteps: [
      {
        title: 'Confirm products are connected',
        body: 'Open Platform → Overview (or Connected products). Each product should show Connected. If not, ask a platform administrator.',
      },
      {
        title: 'Use Product keys only when asked',
        body: 'Connection keys are managed under Platform → Product keys. Secrets are shown once at creation — store them safely; never paste them into public pages.',
      },
      {
        title: 'Run programme work in CeG',
        body: 'Approve visits, assign quizzes, issue certificates, and review news from the usual admin menus. Linked products receive work automatically.',
      },
      {
        title: 'If something looks stuck',
        body: 'Check Platform health and Stuck messages. Use Try again on failed deliveries, or contact platform operations.',
      },
    ],
    integrationPrefix: '/integrations',
    authHeader: 'X-Api-Key',
    authNote:
      'Platform operations use keys managed under Admin → Platform → Product keys. Org-level features (My Certificates, visit quizzes) use portal sign-in — CeG talks to linked products on the server.',
    openApiPath: '/api/v1/openapi.json',
    setupSteps: [
      {
        title: 'Provision product keys (ops)',
        body: 'Set CERTSTUDIO_API_KEY, QUIZFORGE_API_KEY, WORKSHOPOS_* on ceg-core-api. Run seed_ceg_integration_key.py scripts per product.',
      },
      {
        title: 'Platform console',
        body: 'Superadmin → Platform: tenant suspend, failed job requeue, cross-product stats via proxied /integrations/platform/* on each product.',
      },
      {
        title: 'Visit → quiz flow',
        body: 'Approved visits can spawn QuizForge assignments via core API services using external_visit_id correlation.',
      },
      {
        title: 'Visit → certificate flow',
        body: 'POST /portal/certificates/jobs (admin JWT) proxies Cert Studio bulk jobs; participants see certs under /user/my-certificates.',
      },
      {
        title: 'Inbound news (FetchDesk)',
        body: 'POST /integrations/news with X-Api-Key matching FETCHCULL_INBOUND_API_KEY or HMAC X-Fetchdesk-Signature.',
      },
      {
        title: 'Inbound cert webhooks',
        body: 'Register Cert Studio webhooks pointing at CeG /integrations/cert-events (when configured) to sync certificate registry.',
      },
    ],
    endpoints: [
      { method: 'POST', path: '/integrations/news', summary: 'Inbound FetchDesk / automation news push' },
      { method: 'POST', path: '/integrations/quiz', summary: 'Inbound quiz payload hooks (when enabled)' },
      { method: 'GET', path: '/portal/certificates/me', summary: 'User JWT — list my certificates' },
      { method: 'POST', path: '/portal/certificates/jobs', summary: 'Admin — proxy bulk cert job to Cert Studio' },
      { method: 'GET', path: '/portal/certificates/jobs/{id}', summary: 'Poll proxied cert job status' },
    ],
    examples: [
      {
        title: 'Push news from FetchDesk (inbound)',
        language: 'bash',
        code: `curl -s -X POST "{{base}}/integrations/news" \\
  -H "X-Api-Key: YOUR_INBOUND_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Workshop announcement",
    "summary": "Short blurb",
    "content": "Full HTML or text",
    "url": "https://source.example/item/1",
    "external_id": "fd-123"
  }'`,
      },
    ],
    envVars: [
      { name: 'CERTSTUDIO_API_KEY / CERT_STUDIO_API_KEY', description: 'Outbound Cert Studio integration key' },
      { name: 'QUIZFORGE_API_KEY', description: 'Outbound QuizForge integration key' },
      { name: 'FETCHCULL_INBOUND_API_KEY', description: 'Must match FetchDesk tenant ceg_api_key for news push' },
      { name: 'CEG_INTERNAL_SECRET', description: 'Server-to-server trust between CeG microservices' },
    ],
    connectsTo: ['quizforge', 'certstudio', 'workshopos', 'fetchdesk'],
    faq: [
      ...COMMON_FAQ,
      {
        q: 'Do I need CeG to use Cert Studio or QuizForge?',
        a: 'No. Each product has its own tenant integration API. CeG is optional middleware for government programme workflows (visits, multi-product ops).',
      },
      {
        q: 'Why 503 on certificate features?',
        a: 'CERTSTUDIO_API_KEY or CERTSTUDIO_API_BASE is missing or Cert Studio is unreachable. Check platform health and seed scripts.',
      },
    ],
  },
  fetchdesk: {
    id: 'fetchdesk',
    title: 'FetchDesk → CeG integration',
    tagline:
      'Push approved crawl items into CeG Portal news queues. Configure hub URL + inbound API key on the workspace Integrations / Automation screen.',
    integrationPrefix: '/integrations/ceg',
    authHeader: 'X-Api-Key',
    authNote:
      'FetchDesk stores ceg_api_base and ceg_api_key per tenant. The key must equal CeG FETCHCULL_INBOUND_API_KEY — not the outbound FETCHCULL_API_KEY.',
    setupSteps: [
      {
        title: 'Get CeG inbound credentials',
        body: 'From CeG ops: FETCHCULL_INBOUND_API_KEY and public CeG API base (e.g. https://portal.example/api/v1).',
      },
      {
        title: 'Configure FetchDesk workspace',
        body: 'Automation or Integrations → CeG hub URL + inbound API key → Test connection.',
      },
      {
        title: 'Choose push mode',
        body: 'Manual push per item, or automation rule action push_ceg_news on item.created / item.updated.',
      },
      {
        title: 'Verify on CeG',
        body: 'Items land in news approval queue or draft depending on FETCHCULL_NEWS_INGEST_MODE on CeG.',
      },
    ],
    endpoints: [
      { method: 'GET', path: '/integrations/ceg', summary: 'Workspace JWT — read CeG config (key masked)' },
      { method: 'PATCH', path: '/integrations/ceg', summary: 'Update hub URL, key, filters' },
      { method: 'POST', path: '/integrations/ceg/test', summary: 'Test CeG connectivity' },
      { method: 'POST', path: '/items/{id}/push-ceg', summary: 'Manual push single item to CeG /integrations/news' },
    ],
    examples: [
      {
        title: 'CeG ingress (called by FetchDesk worker)',
        language: 'bash',
        code: `curl -s -X POST "https://ceg-portal.example/api/v1/integrations/news" \\
  -H "X-Api-Key: SAME_AS_FETCHDESK_CEG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "title": "...", "external_id": "crawl-42", "url": "..." }'`,
      },
    ],
    envVars: [
      { name: 'tenant.ceg_integration_config.ceg_api_base', description: 'CeG core API /api/v1 prefix' },
      { name: 'tenant.ceg_integration_config.ceg_api_key', description: 'Matches CeG FETCHCULL_INBOUND_API_KEY' },
    ],
    connectsTo: ['ceg_portal'],
    faq: [
      {
        q: 'Push returns 401 on CeG',
        a: 'Keys mismatch. FetchDesk ceg_api_key must equal CeG FETCHCULL_INBOUND_API_KEY exactly.',
      },
      {
        q: 'HMAC vs API key?',
        a: 'CeG accepts either X-Api-Key (inbound key) or X-Fetchdesk-Signature HMAC when FETCHCULL_WEBHOOK_HMAC_SECRET is set.',
      },
      ...COMMON_FAQ.slice(1, 3),
    ],
  },
};

export function getProductDoc(product: IntegrationProductId): ProductIntegrationDoc {
  return PRODUCT_DOCS[product];
}

export function interpolateDocText(text: string, baseUrl: string, origin?: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const root = (origin || base.replace(/\/api\/v1$/i, '').replace(/\/v1$/i, '')).replace(/\/+$/, '');
  return text.replace(/\{\{base\}\}/g, base).replace(/\{\{origin\}\}/g, root);
}
