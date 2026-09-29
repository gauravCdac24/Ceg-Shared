export type Verdict<T extends string = string> = {
    ok: true;
    value: string;
} | {
    ok: false;
    code: T;
    message: string;
};
export declare function validatePAN(raw: string | null | undefined): Verdict<"empty" | "invalid">;
export declare function validateGST(raw: string | null | undefined): Verdict<"empty" | "invalid">;
export declare function validateAadhaar(raw: string | null | undefined): Verdict<"empty" | "wrong_length" | "leading_digit" | "spam_repeated" | "checksum">;
//# sourceMappingURL=pan_gst_aadhaar.d.ts.map