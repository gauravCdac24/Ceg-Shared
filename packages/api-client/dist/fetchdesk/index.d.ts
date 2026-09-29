import { type CreateApiOptions } from "../core";
import type { paths } from "./schema";
export type FetchDeskPaths = paths;
export declare function createFetchDeskClient(opts: CreateApiOptions): import("openapi-fetch").Client<paths, `${string}/${string}`>;
export type FetchDeskClient = ReturnType<typeof createFetchDeskClient>;
//# sourceMappingURL=index.d.ts.map