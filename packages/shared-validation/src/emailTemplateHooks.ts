/**
 * XI-04 — Email template hooks shared across CeG-facing apps.
 *
 * Authoritative payload is bundled JSON so TS + backends can parity-test the same bytes.
 */

import EMAIL_TEMPLATE_CONTRACT from "./fixtures/email_template_contract.json";

export type EmailTemplateContract = typeof EMAIL_TEMPLATE_CONTRACT;

export const EMAIL_TEMPLATE_CONTRACT_VERSION = EMAIL_TEMPLATE_CONTRACT.version;

export function getEmailTemplateContract(): EmailTemplateContract {
  return EMAIL_TEMPLATE_CONTRACT as EmailTemplateContract;
}

/** Map Workshop `{name}` / `{ref}` composer tokens into Cert Studio style fields (partial overlap). */
export function workshopBraceToCanonicalFields(vars: {
  name?: string;
  ref?: string;
}): Record<string, string> {
  return {
    recipient_name: vars.name ?? "",
    certificate_link: vars.ref ?? "",
  };
}

export function listCanonicalPlaceholderKeys(contract: EmailTemplateContract = EMAIL_TEMPLATE_CONTRACT): string[] {
  return contract.canonical_variables.map((v) => v.key);
}
