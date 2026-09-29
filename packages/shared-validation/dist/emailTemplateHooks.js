/**
 * XI-04 — Email template hooks shared across CeG-facing apps.
 *
 * Authoritative payload is bundled JSON so TS + backends can parity-test the same bytes.
 */
import EMAIL_TEMPLATE_CONTRACT from "./fixtures/email_template_contract.json";
export const EMAIL_TEMPLATE_CONTRACT_VERSION = EMAIL_TEMPLATE_CONTRACT.version;
export function getEmailTemplateContract() {
    return EMAIL_TEMPLATE_CONTRACT;
}
/** Map Workshop `{name}` / `{ref}` composer tokens into Cert Studio style fields (partial overlap). */
export function workshopBraceToCanonicalFields(vars) {
    return {
        recipient_name: vars.name ?? "",
        certificate_link: vars.ref ?? "",
    };
}
export function listCanonicalPlaceholderKeys(contract = EMAIL_TEMPLATE_CONTRACT) {
    return contract.canonical_variables.map((v) => v.key);
}
//# sourceMappingURL=emailTemplateHooks.js.map