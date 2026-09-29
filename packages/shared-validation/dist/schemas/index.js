import { z } from "zod";
import { isValidIndianMobile, validatePhone } from "../phone";
import { validatePincodeIN } from "../pincode";
import { validateAadhaar, validateGST, validatePAN } from "../pan_gst_aadhaar";
import { looksLikeSpam } from "../spam";
import { resolveStateName } from "../data/states-cities";
import { validatePasswordPolicy } from "../passwordPolicy";
/* ──────────────────────────────────────────────────────────────────────────
 * Atomic field schemas — compose these into form-level schemas below.
 * ────────────────────────────────────────────────────────────────────── */
export const nameSchema = z
    .string()
    .trim()
    .min(2, "Name is too short")
    .max(120, "Name is too long")
    .refine((v) => !/^\d+$/.test(v), "Name cannot be only digits")
    .refine((v) => !looksLikeSpam(v), "Name looks like spam")
    .refine((v) => /^[A-Za-z][A-Za-z .'\-]*$/.test(v), "Name can only contain letters, spaces, hyphens, and apostrophes");
export const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email format is invalid")
    .max(255, "Email is too long");
export const indianMobileSchema = z
    .string()
    .trim()
    .refine((v) => isValidIndianMobile(v), "Enter a valid Indian mobile number");
/** Accept any country in E.164 (uses libphonenumber-js). */
export const intlPhoneSchema = z
    .string()
    .trim()
    .superRefine((v, ctx) => {
    const result = validatePhone(v);
    if (!result.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
    }
});
export const pincodeINSchema = z
    .string()
    .trim()
    .superRefine((v, ctx) => {
    const result = validatePincodeIN(v);
    if (!result.ok)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
});
export const panSchema = z
    .string()
    .trim()
    .toUpperCase()
    .superRefine((v, ctx) => {
    const r = validatePAN(v);
    if (!r.ok)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.message });
});
export const gstSchema = z
    .string()
    .trim()
    .toUpperCase()
    .superRefine((v, ctx) => {
    const r = validateGST(v);
    if (!r.ok)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.message });
});
export const aadhaarSchema = z
    .string()
    .trim()
    .superRefine((v, ctx) => {
    const r = validateAadhaar(v);
    if (!r.ok)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.message });
});
export const stateSchema = z
    .string()
    .trim()
    .refine((v) => resolveStateName(v) !== null, "Select a valid state");
export const citySchema = z
    .string()
    .trim()
    .min(2, "City is too short")
    .max(80, "City is too long")
    .refine((v) => !looksLikeSpam(v), "City looks like spam");
/** Cross-app registration policy (WorkshopOS / QuizForge / FetchDesk / Cert Studio local dev alignment). */
export const passwordSchema = z.string().superRefine((val, ctx) => {
    const msg = validatePasswordPolicy(val);
    if (msg) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    }
});
export const slugSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug is too short")
    .max(64, "Slug is too long")
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug must start with a letter/digit and contain only a-z, 0-9, hyphens");
export const employeeIdSchema = z
    .string()
    .trim()
    .min(2, "Employee ID is too short")
    .max(64, "Employee ID is too long")
    .regex(/^[A-Za-z0-9\-_./]+$/, "Employee ID has invalid characters");
/* ──────────────────────────────────────────────────────────────────────────
 * Form-level schemas reused across all 5 frontends.
 * Add product-specific schemas in the consuming app, NOT here.
 * ────────────────────────────────────────────────────────────────────── */
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required").max(128),
});
export const registerSchema = z
    .object({
    full_name: nameSchema,
    email: emailSchema,
    mobile: indianMobileSchema.optional(),
    password: passwordSchema,
    confirm_password: z.string(),
})
    .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
});
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});
export const resetPasswordSchema = z
    .object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
    new_password: passwordSchema,
    confirm_password: z.string(),
})
    .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
});
export const addressSchema = z.object({
    line1: z.string().trim().min(2, "Address is too short").max(255, "Address is too long"),
    line2: z.string().trim().max(255).optional().or(z.literal("")),
    state: stateSchema,
    city: citySchema,
    pincode: pincodeINSchema,
    country: z.literal("India").default("India"),
});
export const conferenceRegistrationSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    phone: indianMobileSchema,
    designation: z.string().trim().max(100).optional().or(z.literal("")),
    organisation: z.string().trim().max(100).optional().or(z.literal("")),
    state: stateSchema,
    city: citySchema,
    pincode: pincodeINSchema,
    country: z.literal("India").default("India"),
    anythingelse: z.string().trim().max(4000).optional().or(z.literal("")),
});
export const tenantRegistrationSchema = z.object({
    org_name: nameSchema,
    slug: slugSchema,
    contact_name: nameSchema,
    contact_email: emailSchema,
    contact_phone: indianMobileSchema.optional(),
    org_type: z.enum(["government", "private", "ngo", "educational", "research"]),
    domain: z.string().trim().max(255)
        .regex(/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Domain must look like example.in")
        .optional()
        .or(z.literal("")),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a #RRGGBB hex").default("#1D4ED8"),
});
export const visitCreateSchema = z.object({
    requester_name: nameSchema,
    requester_email: emailSchema,
    requester_mobile: indianMobileSchema,
    institute_name: z.string().trim().min(2, "Institute is too short").max(255),
    purpose: z.string().trim().max(2000).optional().or(z.literal("")),
    proposed_date: z.string().trim().max(32).optional().or(z.literal("")),
    proposed_time: z.string().trim().max(32).optional().or(z.literal("")),
    numberOfVisitors: z.coerce.number().int().min(1).max(500).optional(),
    designation: z.string().trim().max(120).optional().or(z.literal("")),
});
//# sourceMappingURL=index.js.map