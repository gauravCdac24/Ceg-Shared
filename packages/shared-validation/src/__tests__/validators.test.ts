import { describe, expect, it } from "vitest";

import { validatePhone, isValidIndianMobile } from "../phone";
import { validatePincodeIN } from "../pincode";
import { validatePAN, validateGST, validateAadhaar } from "../pan_gst_aadhaar";
import { hasLongRepeatedRun, hasSequentialRun, looksLikeSpam } from "../spam";
import { citiesForState, resolveStateName, STATE_NAMES } from "../data/states-cities";
import { parseServerValidationErrors, extractServerValidationEnvelope } from "../server-errors";
import { passwordSchema } from "../schemas";

describe("spam heuristics", () => {
  it("detects repeated digit runs", () => {
    expect(hasLongRepeatedRun("9999999999")).toBe(true);
    expect(hasLongRepeatedRun("9876500100")).toBe(false);
    expect(hasLongRepeatedRun("aaaaa", 4)).toBe(true);
  });

  it("detects ascending and descending runs", () => {
    expect(hasSequentialRun("0123456789")).toBe(true);
    expect(hasSequentialRun("9876543210")).toBe(true);
    expect(hasSequentialRun("9845162703")).toBe(false);
  });

  it("flags obvious spam strings", () => {
    expect(looksLikeSpam("a")).toBe(true);
    expect(looksLikeSpam("33333")).toBe(true);
    expect(looksLikeSpam("Rahul Verma")).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts a valid Indian mobile in national form", () => {
    const r = validatePhone("9845162703");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe("+919845162703");
  });

  it("rejects spam (repeated digits)", () => {
    const r = validatePhone("3333333333");
    expect(r.ok).toBe(false);
  });

  it("rejects sequential", () => {
    const r = validatePhone("9876543210");
    expect(r.ok).toBe(false);
  });

  it("rejects invalid international", () => {
    const r = validatePhone("+123");
    expect(r.ok).toBe(false);
  });

  it("isValidIndianMobile fast-path matches", () => {
    expect(isValidIndianMobile("9845162703")).toBe(true);
    expect(isValidIndianMobile("5876543210")).toBe(false);
    expect(isValidIndianMobile("3333333333")).toBe(false);
  });
});

describe("validatePincodeIN", () => {
  it("accepts valid pincodes", () => {
    expect(validatePincodeIN("110001").ok).toBe(true);
    expect(validatePincodeIN("600025").ok).toBe(true);
  });
  it("rejects leading zero", () => {
    expect(validatePincodeIN("010001").ok).toBe(false);
  });
  it("rejects wrong length", () => {
    expect(validatePincodeIN("11000").ok).toBe(false);
    expect(validatePincodeIN("1100011").ok).toBe(false);
  });
  it("rejects spam", () => {
    expect(validatePincodeIN("333333").ok).toBe(false);
    expect(validatePincodeIN("123456").ok).toBe(false);
  });
});

describe("PAN / GST / Aadhaar", () => {
  it("validates PAN", () => {
    expect(validatePAN("ABCDE1234F").ok).toBe(true);
    expect(validatePAN("ABCD1234F").ok).toBe(false);
  });
  it("validates GST", () => {
    expect(validateGST("27ABCDE1234F1Z5").ok).toBe(true);
    expect(validateGST("27ABCDE1234F1Z").ok).toBe(false);
  });
  it("validates Aadhaar with Verhoeff", () => {
    expect(validateAadhaar("234567890124").ok).toBe(true);
    expect(validateAadhaar("234567890123").ok).toBe(false);
    expect(validateAadhaar("999999999999").ok).toBe(false);
  });
});

describe("states/cities dataset", () => {
  it("contains 28 states + 8 UTs (36 total)", () => {
    expect(STATE_NAMES.length).toBe(36);
  });
  it("returns cities for known states", () => {
    expect(citiesForState("Tamil Nadu").includes("Chennai")).toBe(true);
    expect(citiesForState("Karnataka").includes("Bengaluru")).toBe(true);
  });
  it("resolves case-insensitive", () => {
    expect(resolveStateName("tamil nadu")).toBe("Tamil Nadu");
    expect(resolveStateName("Nope")).toBe(null);
  });
});

describe("server-errors parser", () => {
  it("parses CeG envelope ({data: [...]})", () => {
    const parsed = parseServerValidationErrors({
      ok: false,
      code: "validation_error",
      data: [
        { field: "body.full_name", code: "value_error", message: "Name has spam" },
        { field: "body.mobile", code: "value_error", message: "Phone is invalid" },
      ],
    });
    expect(parsed["full_name"]).toBe("Name has spam");
    expect(parsed["mobile"]).toBe("Phone is invalid");
  });

  it("parses FetchDesk envelope ({errors: [...]})", () => {
    const parsed = parseServerValidationErrors({
      success: false,
      errors: [{ field: "email", code: "value_error", message: "Bad email" }],
    });
    expect(parsed["email"]).toBe("Bad email");
  });

  it("handles missing payload gracefully", () => {
    expect(parseServerValidationErrors(null)).toEqual({});
    expect(parseServerValidationErrors({} as any)).toEqual({});
  });

  it("extracts envelope from axios-shaped errors", () => {
    const envelope = {
      ok: false,
      code: "validation_error",
      errors: [{ field: "body.email", code: "value_error", message: "Bad email" }],
    };
    const axiosLike = { response: { status: 422, data: envelope } };
    expect(extractServerValidationEnvelope(axiosLike)).toEqual(envelope);
    expect(parseServerValidationErrors(extractServerValidationEnvelope(axiosLike))).toEqual({
      email: "Bad email",
    });
  });

  it("extracts envelope from CeG fetch errors", () => {
    const envelope = {
      ok: false,
      code: "validation_error",
      data: [{ field: "body.password", code: "value_error", message: "Too weak" }],
    };
    expect(extractServerValidationEnvelope({ data: envelope })).toEqual(envelope);
  });
});

describe("passwordSchema (cross-app policy)", () => {
  it("accepts a representative strong password", () => {
    expect(passwordSchema.safeParse("Good#Pass1").success).toBe(true);
  });

  it("rejects passwords missing classes or with long repeats", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllower1#").success).toBe(false);
    expect(passwordSchema.safeParse("GoodPass12").success).toBe(false); // no special
    expect(passwordSchema.safeParse("Aaaaaa1#").success).toBe(false); // 5+ repeated 'a'
  });
});
