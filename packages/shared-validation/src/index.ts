/**
 * @ceg/shared-validation
 *
 * One canonical validation surface for every Ceg frontend.
 *
 *   import { validatePhone, pincodeINSchema, STATES_AND_CITIES } from "@ceg/shared-validation";
 *
 * Schemas (Zod) live under `./schemas`. Raw validator helpers and the
 * states-cities dataset are exported from the package root.
 */

export * from "./phone";
export * from "./pincode";
export * from "./pan_gst_aadhaar";
export * from "./spam";
export * from "./server-errors";
export * from "./data/states-cities";
export * from "./emailTemplateHooks";
export * from "./crossAppAuth";
export * from "./passwordPolicy";
export * from "./aiProvider";
export * as schemas from "./schemas";
