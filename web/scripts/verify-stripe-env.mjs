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

function hintForBadValue(name, raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (v.startsWith("mk_")) {
    if (name.includes("PUBLISHABLE")) {
      return " — use Publishable key pk_test_… or pk_live_… from Stripe → Developers → API keys";
    }
    return " — looks like a restricted/machine key; use Secret key sk_test_… or sk_live_… from Stripe → Developers → API keys";
  }
  if (/^\$|^\d+(\.\d+)?$/.test(v)) {
    return " — use the Price ID (price_…), not the dollar amount; Stripe → Products → your price → API ID";
  }
  if (/^_{2,}$|^x+$/i.test(v) || v.toLowerCase() === "n/a") {
    return " — replace placeholder; leave the line unset if optional";
  }
  if (name.includes("WEBHOOK") && !v.startsWith("whsec_")) {
    return " — Stripe → Developers → Webhooks → endpoint → Signing secret (whsec_…)";
  }
  if (name.includes("PRICE") && !v.startsWith("price_")) {
    return " — must be price_… from Stripe Dashboard (recurring price for subscriptions)";
  }
  if (name.includes("STRIPE_SECRET") && !v.startsWith("sk_") && !v.startsWith("rk_")) {
    return " — Stripe → Developers → API keys → Secret key";
  }
  if (name.includes("PUBLISHABLE") && !v.startsWith("pk_")) {
    return " — Stripe → Developers → API keys → Publishable key (pk_test_… or pk_live_…)";
  }
  return "";
}

function checkKey(name, { required = true, prefixes = [] } = {}) {
  const raw = String(process.env[name] || "").trim();
  const issues = [];
  if (!raw) {
    if (required) issues.push("missing");
    return { name, ok: !required, raw: "", issues, mask: "(not set)", hint: "" };
  }
  if (prefixes.length && !prefixes.some((p) => raw.startsWith(p))) {
    issues.push(`expected prefix ${prefixes.join(" or ")}`);
  }
  const hint = issues.length ? hintForBadValue(name, raw) : "";
  return { name, ok: issues.length === 0, raw, issues, mask: mask(raw), hint };
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
  checkKey("STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY", { required: false, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_PODCAST_SPONSOR_IMPACT", { required: false, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL", { required: false, prefixes: ["price_"] }),
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
const failures = [];
for (const c of checks) {
  const status = c.ok ? "OK" : "FAIL";
  const detail = c.issues?.length ? ` — ${c.issues.join(", ")}` : "";
  const hint = !c.ok && c.hint ? c.hint : "";
  console.log(`${status.padEnd(4)} ${c.name}: ${c.mask}${detail}${hint}`);
  if (!c.ok) {
    failed += 1;
    failures.push(c);
  }
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

const podcastPrices = [
  "STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY",
  "STRIPE_PRICE_PODCAST_SPONSOR_IMPACT",
  "STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL",
].every((k) => !!String(process.env[k] || "").trim());
const podcastCheckout = !!secret && podcastPrices;

console.log("\n[verify:stripe-env] App flags (same as /api/billing/capabilities):");
console.log(`  membershipCheckout: ${membershipCheckout}`);
console.log(`  sponsorSubscriptionCheckout: ${!!String(process.env.STRIPE_PRICE_SPONSOR_MONTHLY || "").trim() && !!secret}`);
console.log(`  podcastSponsorCheckout: ${podcastCheckout}`);
console.log(`  stripeWebhook: ${stripeWebhook}`);
console.log(
  "\n[verify:stripe-env] Mission partner one-time products (Supporting/Growth/Strategic) are apply-only in the app today — Stripe products are for invoicing/manual use until checkout is wired.",
);

if (!webhookSecret) {
  console.error(
    "\n[verify:stripe-env] No webhook secret — set STRIPE_WEBHOOK_TEST_SECRET and/or STRIPE_WEBHOOK_LIVE_SECRET (or legacy STRIPE_WEBHOOK_SECRET).",
  );
  failed += 1;
}

if (failed > 0) {
  const requiredFails = failures.filter((c) =>
    ["STRIPE_SECRET_KEY", "STRIPE_PRICE_SUPPORT_MONTHLY"].includes(c.name) ||
    c.name.includes("PRO_MONTHLY or MEMBER"),
  );
  console.error(`\n[verify:stripe-env] ${failed} check(s) failed. See web/.env.local.example and docs/mvp-production-launch.md §5b.`);
  if (requiredFails.length) {
    console.error("\n[verify:stripe-env] Minimum for membership checkout (QA = Test mode):");
    console.error("  1. Stripe Dashboard → toggle Test mode (top right)");
    console.error("  2. Developers → API keys → Secret key → sk_test_… → STRIPE_SECRET_KEY");
    console.error("  3. Same page → Publishable key → pk_test_… → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    console.error("  4. Product catalog → Support ($1/mo) + Pro ($5.99/mo) → each recurring Price → price_… IDs");
    console.error("  5. Developers → Webhooks → Add endpoint → signing secret whsec_… → STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_TEST_SECRET)");
    console.error("  Optional podcast/sponsor price_* vars: comment out or fix — or leave unset if not testing those flows.");
  }
  process.exit(1);
}

console.log("\n[verify:stripe-env] All required Stripe env vars look valid locally.");
console.log("  On QA: redeploy Preview after Vercel env changes, then confirm in the signed-in app or:");
console.log("  GET /api/billing/capabilities → membershipCheckout: true, stripeWebhook: true");
