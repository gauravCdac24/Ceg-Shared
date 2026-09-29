import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type WorkshopOSPaths = paths;
export function createWorkshopOSClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}
export type WorkshopOSClient = ReturnType<typeof createWorkshopOSClient>;
