#!/usr/bin/env node
/**
 * Generate TypeScript types from each docs/api-contracts/<svc>/openapi.json.
 *
 *   pnpm --filter @ceg/api-client generate
 *
 * Output: packages/api-client/src/<svc>/schema.d.ts
 *
 * Each <svc>/index.ts re-exports `paths` and constructs an `openapi-fetch`
 * client. We never call openapi-typescript at runtime; this is a build-time
 * step that should run whenever a backend's openapi.json changes.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CONTRACTS_DIR = resolve(REPO_ROOT, "docs", "api-contracts");
const OUT_DIR = resolve(__dirname, "..", "src");

const SERVICES = [
  { slug: "ceg-core", contract: "ceg-core-api" },
  { slug: "ceg-gateway", contract: "ceg-api-gateway" },
  { slug: "notification", contract: "ceg-notification-service" },
  { slug: "workshopos", contract: "workshopos-backend" },
  { slug: "quizforge", contract: "quizforge-backend" },
  { slug: "cert-studio", contract: "cert-studio-backend" },
  { slug: "fetchdesk", contract: "fetchcull-backend" },
];

async function generateOne({ slug, contract }) {
  const inputPath = resolve(CONTRACTS_DIR, contract, "openapi.json");
  if (!existsSync(inputPath)) {
    console.error(`  SKIP ${slug}: ${inputPath} not found`);
    return;
  }
  console.log(`  generating ${slug} from ${contract}/openapi.json...`);
  const raw = await readFile(inputPath, "utf-8");
  const spec = JSON.parse(raw);
  const ast = await openapiTS(spec);
  const schemaTs = astToString(ast);
  const outDir = resolve(OUT_DIR, slug);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "schema.d.ts"), schemaTs, "utf-8");
}

async function main() {
  console.log("Generating typed clients from", CONTRACTS_DIR);
  for (const svc of SERVICES) {
    await generateOne(svc);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
