import { createApiClient, type CreateApiOptions } from "../core";
import type { paths } from "./schema";

export type QuizForgePaths = paths;
export function createQuizForgeClient(opts: CreateApiOptions) {
  return createApiClient<paths>(opts);
}
export type QuizForgeClient = ReturnType<typeof createQuizForgeClient>;
