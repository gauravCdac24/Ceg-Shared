import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type NotificationPaths = paths;
export function createNotificationClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}
export type NotificationClient = ReturnType<typeof createNotificationClient>;
