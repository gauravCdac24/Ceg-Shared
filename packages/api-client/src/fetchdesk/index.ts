import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type FetchDeskPaths = paths;
export function createFetchDeskClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}
export type FetchDeskClient = ReturnType<typeof createFetchDeskClient>;
