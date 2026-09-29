# CeG fleet packages

Shared libraries for the CeG Portal and the sibling products (WorkshopOS, QuizForge, Cert Studio, FetchDesk). Product applications live in their own repositories. `C:\Users\hp\Documents\Ceg-Shared` junctions `packages`, `libs`, and `shared` here, and the portal loads `@ceg/*` from `../Ceg-Shared/packages/*`.

## Layout

| Path | Used by |
| --- | --- |
| `packages/agent-ui`, `api-client`, `ceg-cert-integration`, `commercial-ui`, `design-tokens`, `shared-ui`, `shared-validation` | Portal frontend |
| `packages/ambient-backgrounds` | WorkshopOS, FetchDesk |
| `packages/job-progress` | QuizForge |
| `packages/agent-core`, `ai-providers`, `ceg-observability`, `commercial-core`, `integration-resilience`, `malware-scan`, `platform-notifications`, `response-envelope` | Portal Python API |
| `packages/eligibility-agent`, `page-studio` | WorkshopOS backend |
| `packages/notifications`, `shared-crypto`, `e2e` | Cross-product helpers and end-to-end tests |
| `libs/ceg-auth` | Portal auth library |
| `shared/ceg-a11y-preheader`, `shared/python` | Accessibility widget and copied Python validators |
