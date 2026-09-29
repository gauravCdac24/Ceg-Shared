import { type CreateApiOptions } from "../core";
import type { paths } from "./schema";
export type QuizForgePaths = paths;
export declare function createQuizForgeClient(opts: CreateApiOptions): import("openapi-fetch").Client<paths, `${string}/${string}`>;
export type QuizForgeClient = ReturnType<typeof createQuizForgeClient>;
//# sourceMappingURL=index.d.ts.map