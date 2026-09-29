import { type CreateApiOptions } from "../core";
import type { paths } from "./schema";
export type CegCorePaths = paths;
export declare function createCegCoreClient(opts: CreateApiOptions): import("openapi-fetch").Client<paths, `${string}/${string}`>;
export type CegCoreClient = ReturnType<typeof createCegCoreClient>;
//# sourceMappingURL=index.d.ts.map