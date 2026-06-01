/**
 * Verify Stripe env vars for membership billing (no secret values printed).
 * Loads web/.env.local when present.
 *
 * Usage: pnpm --dir web run verify:stripe-env
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return false;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    let value = s.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

function mask(value) {
  const v = String(value || "").trim();
  if (!v) return "(empty)";
  if (v.length <= 12) return `${v.slice(0, 4)}…`;
  return `${v.slice(0, 12)}… (${v.length} chars)`;
}

function checkKey(name, { required = true, prefixes = [] } = {}) {
  const raw = String(process.env[name] || "").trim();
  const issues = [];
  if (!raw) {
    if (required) issues.push("missing");
    return { name, ok: !required, raw: "", issues, mask: "(not set)" };
  }
  if (prefixes.length && !prefixes.some((p) => raw.startsWith(p))) {
    issues.push(`expected prefix ${prefixes.join(" or ")}`);
  }
  return { name, ok: issues.length === 0, raw, issues, mask: mask(raw) };
}

const hadLocal = loadDotEnvLocal();
console.log(`[verify:stripe-env] ${hadLocal ? "Loaded .env.local" : "No .env.local — using process env only"}\n`);

const checks = [
  checkKey("STRIPE_SECRET_KEY", { required: true, prefixes: ["sk_test_", "sk_live_", "rk_test_", "rk_live_"] }),
  checkKey("STRIPE_WEBHOOK_SECRET", { required: false, prefixes: ["whsec_"] }),
  checkKey("STRIPE_WEBHOOK_TEST_SECRET", { required: false, prefixes: ["whsec_"] }),
  checkKey("STRIPE_WEBHOOK_LIVE_SECRET", { required: false, prefixes: ["whsec_"] }),
  checkKey("STRIPE_PRICE_SUPPORT_MONTHLY", { required: true, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_PRO_MONTHLY", { required: false, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_MEMBER_MONTHLY", { required: false, prefixes: ["price_"] }),
  checkKey("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", { required: false, prefixes: ["pk_test_", "pk_live_"] }),
  checkKey("STRIPE_PRICE_SPONSOR_MONTHLY", { required: false, prefixes: ["price_"] }),
  checkKey("APP_BASE_URL", { required: false }),
  checkKey("NEXT_PUBLIC_APP_URL", { required: false }),
];

const proPrice =
  String(process.env.STRIPE_PRICE_PRO_MONTHLY || "").trim() ||
  String(process.env.STRIPE_PRICE_MEMBER_MONTHLY || "").trim();
if (!proPrice) {
  checks.push({
    name: "STRIPE_PRICE_PRO_MONTHLY or STRIPE_PRICE_MEMBER_MONTHLY",
    ok: false,
    issues: ["missing Pro price ID"],
    mask: "(not set)",
  });
}

let failed = 0;
for (const c of checks) {
  const status = c.ok ? "OK" : "FAIL";
  const detail = c.issues?.length ? ` — ${c.issues.join(", ")}` : "";
  console.log(`${status.padEnd(4)} ${c.name}: ${c.mask}${detail}`);
  if (!c.ok) failed += 1;
}

const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
const membershipCheckout =
  secret.startsWith("sk_") || secret.startsWith("rk_")
    ? !!String(process.env.STRIPE_PRICE_SUPPORT_MONTHLY || "").trim() && !!proPrice
    : false;
const webhookSecret =
  String(process.env.STRIPE_WEBHOOK_SECRET || "").trim() ||
  String(process.env.STRIPE_WEBHOOK_TEST_SECRET || "").trim() ||
  String(process.env.STRIPE_WEBHOOK_LIVE_SECRET || "").trim();
const stripeWebhook = !!secret && !!webhookSecret;

console.log("\n[verify:stripe-env] App flags (same as /api/billing/capabilities):");
console.log(`  membershipCheckout: ${membershipCheckout}`);
console.log(`  stripeWebhook: ${stripeWebhook}`);

if (!webhookSecret) {
  console.error(
    "\n[verify:stripe-env] No webhook secret — set STRIPE_WEBHOOK_TEST_SECRET and/or STRIPE_WEBHOOK_LIVE_SECRET (or legacy STRIPE_WEBHOOK_SECRET).",
  );
  failed += 1;
}

if (failed > 0) {
  console.error(`\n[verify:stripe-env] ${failed} check(s) failed. See web/.env.local.example and docs/mvp-production-launch.md §5b.`);
  process.exit(1);
}

console.log("\n[verify:stripe-env] All required Stripe env vars look valid locally.");
console.log("  On QA: redeploy Preview after Vercel env changes, then confirm in the signed-in app or:");
console.log("  GET /api/billing/capabilities → membershipCheckout: true, stripeWebhook: true");
