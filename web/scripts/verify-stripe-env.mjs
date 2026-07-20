/**
 * Verify Stripe env vars for membership billing (no secret values printed).
 * Loads web/.env.local when present. Validates Pro ($5.99/year) price ID (Support retired).
 *
 * Usage: pnpm --dir web run verify:stripe-env
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPPORT_ANNUAL_CENTS = 99;
const PRO_ANNUAL_CENTS = 599;
const BLOCKED = new Set(["price_1TlqQ9CiwOqAGcUDuZkKPlJ2"]);

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

const supportYearly =
  String(process.env.STRIPE_PRICE_SUPPORT_YEARLY || "").trim() ||
  String(process.env.STRIPE_PRICE_SUPPORT_ANNUAL || "").trim();
const proYearly =
  String(process.env.STRIPE_PRICE_PRO_YEARLY || "").trim() ||
  String(process.env.STRIPE_PRICE_PRO_MONTHLY || "").trim() ||
  String(process.env.STRIPE_PRICE_MEMBER_MONTHLY || "").trim();

const checks = [
  checkKey("STRIPE_SECRET_KEY", { required: true, prefixes: ["sk_test_", "sk_live_", "rk_test_", "rk_live_"] }),
  checkKey("STRIPE_WEBHOOK_SECRET", { required: false, prefixes: ["whsec_"] }),
  checkKey("STRIPE_WEBHOOK_TEST_SECRET", { required: false, prefixes: ["whsec_"] }),
  checkKey("STRIPE_WEBHOOK_LIVE_SECRET", { required: false, prefixes: ["whsec_"] }),
  checkKey("STRIPE_PRICE_PRO_YEARLY", { required: !!proYearly, prefixes: ["price_"] }),
  checkKey("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", { required: false, prefixes: ["pk_test_", "pk_live_"] }),
  checkKey("STRIPE_PRICE_SPONSOR_MONTHLY", { required: false, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY", { required: false, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_PODCAST_SPONSOR_IMPACT", { required: false, prefixes: ["price_"] }),
  checkKey("STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL", { required: false, prefixes: ["price_"] }),
  checkKey("APP_BASE_URL", { required: false }),
  checkKey("NEXT_PUBLIC_APP_URL", { required: false }),
];

if (!proYearly) {
  checks.push({
    name: "STRIPE_PRICE_PRO_YEARLY (or monthly fallback)",
    ok: false,
    issues: ["missing Pro price ID"],
    mask: "(not set)",
  });
}

if (supportYearly && BLOCKED.has(supportYearly)) {
  checks.push({
    name: "STRIPE_PRICE_SUPPORT_YEARLY (legacy)",
    ok: false,
    issues: ["blocked — known $99/year mischarge price — remove from env"],
    mask: mask(supportYearly),
  });
} else if (supportYearly) {
  checks.push({
    name: "STRIPE_PRICE_SUPPORT_YEARLY (legacy, unused)",
    ok: true,
    issues: [],
    mask: mask(supportYearly),
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
  secret.startsWith("sk_") || secret.startsWith("rk_") ? !!proYearly : false;
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
console.log(`  expectedPro: $${(PRO_ANNUAL_CENTS / 100).toFixed(2)}/year (Support retired)`);

if (secret && supportYearly && !BLOCKED.has(supportYearly)) {
  console.warn(
    `\n[verify:stripe-env] Legacy Support price ${supportYearly} still set — unused for new checkout.`,
  );
}

if (secret && proYearly) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/prices/${proYearly}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const price = await res.json();
    if (price.error) {
      console.error(`FAIL Pro price lookup: ${price.error.message}`);
      failed += 1;
    } else if (price.unit_amount !== PRO_ANNUAL_CENTS || price.recurring?.interval !== "year") {
      console.error(
        `FAIL Pro price ${proYearly} is $${((price.unit_amount ?? 0) / 100).toFixed(2)}/${price.recurring?.interval || "?"} — expected $5.99/year`,
      );
      failed += 1;
    } else {
      console.log(`OK   Live Pro price validated: $5.99/year`);
    }
  } catch (e) {
    console.error(`FAIL Pro price lookup: ${e.message}`);
    failed += 1;
  }
}

if (!webhookSecret) {
  console.error(
    "\n[verify:stripe-env] No webhook secret — set STRIPE_WEBHOOK_TEST_SECRET and/or STRIPE_WEBHOOK_LIVE_SECRET (or legacy STRIPE_WEBHOOK_SECRET).",
  );
  failed += 1;
}

if (failed > 0) {
  const requiredFails = failures.filter((c) =>
    ["STRIPE_SECRET_KEY"].includes(c.name) ||
    c.name.includes("PRO_YEARLY"),
  );
  console.error(`\n[verify:stripe-env] ${failed} check(s) failed. See web/.env.local.example.`);
  if (requiredFails.length) {
    console.error("\n[verify:stripe-env] Minimum for membership checkout:");
    console.error("  1. Stripe Dashboard → correct mode (Test vs Live)");
    console.error("  2. STRIPE_SECRET_KEY=sk_…");
    console.error("  3. STRIPE_PRICE_PRO_YEARLY=price_… ($5.99/year recurring)");
    console.error("  4. Webhook signing secret whsec_…");
  }
  process.exit(1);
}

console.log("\n[verify:stripe-env] All required Stripe env vars look valid locally.");
console.log("  Also run: pnpm run verify:membership-pricing");
