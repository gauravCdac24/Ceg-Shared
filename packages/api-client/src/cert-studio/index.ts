import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type CertStudioPaths = paths;
export function createCertStudioClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}
export type CertStudioClient = ReturnType<typeof createCertStudioClient>;
