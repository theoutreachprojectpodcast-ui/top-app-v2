/**
 * Pre-production deployment gate — runs all required checks before promoting to production.
 * Fails fast if any gate fails; intended for CI and manual release runs.
 *
 *   pnpm --dir web run gate:production
 *   SKIP_HTTP_SMOKE=1 pnpm --dir web run gate:production
 */
import { spawnSync } from "node:child_process";

const skipHttp = ["1", "true"].includes(String(process.env.SKIP_HTTP_SMOKE || "").toLowerCase());
const skipMobile = ["1", "true"].includes(String(process.env.SKIP_MOBILE_GATE || "").toLowerCase());

const steps = [
  { name: "Route smoke", cmd: "node", args: ["scripts/smoke-routes.mjs"] },
  { name: "Security guards", cmd: "node", args: ["scripts/security-guards-smoke.mjs"] },
  { name: "Auth freeze guards", cmd: "node", args: ["scripts/auth-production-guards.mjs"] },
  { name: "Security posture", cmd: "node", args: ["scripts/verify-security-posture.mjs"] },
  { name: "Production env validation", cmd: "node", args: ["scripts/validate-environment.mjs", "--profile=production", "--strict"] },
  { name: "Capacitor config", cmd: "node", args: ["scripts/validate-capacitor-config.mjs"] },
];

if (!skipMobile) {
  steps.push({
    name: "Mobile production config",
    cmd: "node",
    args: ["scripts/validate-environment.mjs", "--profile=mobile", "--strict"],
  });
}

function runStep(step) {
  console.log(`\n[gate:production] ▶ ${step.name}`);
  const r = spawnSync(step.cmd, step.args, { stdio: "inherit", env: { ...process.env, TOP_VALIDATE_ENV: "1" } });
  if (r.status !== 0) {
    console.error(`[gate:production] ✗ FAILED: ${step.name}`);
    return false;
  }
  console.log(`[gate:production] ✓ ${step.name}`);
  return true;
}

let ok = true;
for (const step of steps) {
  if (!runStep(step)) {
    ok = false;
    break;
  }
}

if (ok && !skipHttp) {
  console.log("\n[gate:production] ▶ Production HTTP smoke (live)");
  const r = spawnSync("node", ["scripts/production-http-smoke.mjs"], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error("[gate:production] ✗ FAILED: Production HTTP smoke");
    ok = false;
  } else {
    console.log("[gate:production] ✓ Production HTTP smoke");
  }
}

if (!ok) {
  console.error("\n[gate:production] BLOCKED — fix failures before production deploy.");
  process.exit(1);
}

console.log("\n[gate:production] All gates passed. Production deploy may proceed.");
