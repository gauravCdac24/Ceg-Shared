import { type CreateApiOptions } from "../core";
import type { paths } from "./schema";
export type NotificationPaths = paths;
export declare function createNotificationClient(opts: CreateApiOptions): import("openapi-fetch").Client<paths, `${string}/${string}`>;
export type NotificationClient = ReturnType<typeof createNotificationClient>;
//# sourceMappingURL=index.d.ts.map