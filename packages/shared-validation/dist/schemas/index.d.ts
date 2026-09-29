import { z } from "zod";
export declare const nameSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const indianMobileSchema: z.ZodString;
/** Accept any country in E.164 (uses libphonenumber-js). */
export declare const intlPhoneSchema: z.ZodString;
export declare const pincodeINSchema: z.ZodString;
export declare const panSchema: z.ZodString;
export declare const gstSchema: z.ZodString;
export declare const aadhaarSchema: z.ZodString;
export declare const stateSchema: z.ZodString;
export declare const citySchema: z.ZodString;
/** Cross-app registration policy (WorkshopOS / QuizForge / FetchDesk / Cert Studio local dev alignment). */
export declare const passwordSchema: z.ZodString;
export declare const slugSchema: z.ZodString;
export declare const employeeIdSchema: z.ZodString;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const registerSchema: z.ZodObject<{
    full_name: z.ZodString;
    email: z.ZodString;
    mobile: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    confirm_password: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
    otp: z.ZodString;
    new_password: z.ZodString;
    confirm_password: z.ZodString;
}, z.core.$strip>;
export declare const addressSchema: z.ZodObject<{
    line1: z.ZodString;
    line2: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    state: z.ZodString;
    city: z.ZodString;
    pincode: z.ZodString;
    country: z.ZodDefault<z.ZodLiteral<"India">>;
}, z.core.$strip>;
export declare const conferenceRegistrationSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    designation: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    organisation: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    state: z.ZodString;
    city: z.ZodString;
    pincode: z.ZodString;
    country: z.ZodDefault<z.ZodLiteral<"India">>;
    anythingelse: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const tenantRegistrationSchema: z.ZodObject<{
    org_name: z.ZodString;
    slug: z.ZodString;
    contact_name: z.ZodString;
    contact_email: z.ZodString;
    contact_phone: z.ZodOptional<z.ZodString>;
    org_type: z.ZodEnum<{
        government: "government";
        private: "private";
        ngo: "ngo";
        educational: "educational";
        research: "research";
    }>;
    domain: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    primary_color: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const visitCreateSchema: z.ZodObject<{
    requester_name: z.ZodString;
    requester_email: z.ZodString;
    requester_mobile: z.ZodString;
    institute_name: z.ZodString;
    purpose: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    proposed_date: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    proposed_time: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    numberOfVisitors: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    designation: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
//# sourceMappingURL=index.d.ts.map