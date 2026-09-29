/**
 * XI-04 — Email template hooks shared across CeG-facing apps.
 *
 * Authoritative payload is bundled JSON so TS + backends can parity-test the same bytes.
 */
import EMAIL_TEMPLATE_CONTRACT from "./fixtures/email_template_contract.json";
export type EmailTemplateContract = typeof EMAIL_TEMPLATE_CONTRACT;
export declare const EMAIL_TEMPLATE_CONTRACT_VERSION: string;
export declare function getEmailTemplateContract(): EmailTemplateContract;
/** Map Workshop `{name}` / `{ref}` composer tokens into Cert Studio style fields (partial overlap). */
export declare function workshopBraceToCanonicalFields(vars: {
    name?: string;
    ref?: string;
}): Record<string, string>;
export declare function listCanonicalPlaceholderKeys(contract?: EmailTemplateContract): string[];
//# sourceMappingURL=emailTemplateHooks.d.ts.map