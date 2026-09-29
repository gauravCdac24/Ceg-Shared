import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type CegCorePaths = paths;
export function createCegCoreClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}

export type CegCoreClient = ReturnType<typeof createCegCoreClient>;
