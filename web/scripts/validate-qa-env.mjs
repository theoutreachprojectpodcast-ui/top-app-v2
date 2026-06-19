/**
 * QA environment validation — ensures QA uses test Stripe, QA Supabase, and QA hostnames.
 *
 *   node scripts/validate-qa-env.mjs
 *   TOP_VALIDATE_ENV=1 node scripts/validate-qa-env.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, "validate-environment.mjs");
const r = spawnSync(process.execPath, [script, "--profile=qa", "--strict"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
