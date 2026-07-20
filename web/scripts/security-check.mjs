/**
 * Aggregated security gate for CI / pre-deploy.
 * Exit nonzero on any critical failure.
 *
 *   pnpm --dir web run security:check
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
  { name: "security:guards", args: ["run", "security:guards"] },
  { name: "verify:auth-freeze", args: ["run", "verify:auth-freeze"] },
  { name: "verify:security", args: ["run", "verify:security"] },
  { name: "security:audit:ci", args: ["run", "security:audit:ci"] },
];

// Live RLS probe when Supabase credentials are present (CI secrets or local env).
const hasLive =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

if (hasLive || process.env.SECURITY_CHECK_REQUIRE_LIVE === "1") {
  steps.push({ name: "security-rls-live-probe", args: ["exec", "node", "scripts/security-rls-live-probe.mjs"] });
} else {
  console.log("[security:check] Skipping live RLS probe (no Supabase credentials in env)");
}

let failed = false;
for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);
  const r = spawnSync("pnpm", step.args, {
    cwd: webRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if ((r.status ?? 1) !== 0) {
    console.error(`[security:check] step failed: ${step.name}`);
    failed = true;
    break;
  }
}

if (failed) process.exit(1);
console.log("\n[security:check] OK");
