import { describe, expect, it } from "vitest";
import {
  EMAIL_TEMPLATE_CONTRACT_VERSION,
  getEmailTemplateContract,
  listCanonicalPlaceholderKeys,
  workshopBraceToCanonicalFields,
} from "../emailTemplateHooks";

describe("emailTemplateHooks (XI-04)", () => {
  it("exposes fixture version for parity tests", () => {
    expect(EMAIL_TEMPLATE_CONTRACT_VERSION).toBe("1");
  });

  it("lists canonical variable keys including recipient_name", () => {
    const keys = listCanonicalPlaceholderKeys(getEmailTemplateContract());
    expect(keys).toContain("recipient_name");
    expect(keys.length).toBeGreaterThanOrEqual(5);
  });

  it("maps workshop brace tokens to overlapping canonical keys", () => {
    const m = workshopBraceToCanonicalFields({ name: "A", ref: "https://x.test/v" });
    expect(m.recipient_name).toBe("A");
    expect(m.certificate_link).toBe("https://x.test/v");
  });
});
