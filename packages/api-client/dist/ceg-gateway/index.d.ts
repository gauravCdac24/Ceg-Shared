import { type CreateApiOptions } from "../core";
import type { paths } from "./schema";
export type CegGatewayPaths = paths;
export declare function createCegGatewayClient(opts: CreateApiOptions): import("openapi-fetch").Client<paths, `${string}/${string}`>;
export type CegGatewayClient = ReturnType<typeof createCegGatewayClient>;
//# sourceMappingURL=index.d.ts.map