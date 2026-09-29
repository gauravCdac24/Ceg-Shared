import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type CegGatewayPaths = paths;
export function createCegGatewayClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}
export type CegGatewayClient = ReturnType<typeof createCegGatewayClient>;
