import { type CreateApiOptions } from "../core";
import type { paths } from "./schema";
export type CertStudioPaths = paths;
export declare function createCertStudioClient(opts: CreateApiOptions): import("openapi-fetch").Client<paths, `${string}/${string}`>;
export type CertStudioClient = ReturnType<typeof createCertStudioClient>;
//# sourceMappingURL=index.d.ts.map