/**
 * Verify canonical membership pricing and (when STRIPE_SECRET_KEY is set) live Stripe price amounts.
 * Fails closed if Support ≠ $0.99/year, Pro ≠ $5.99/year, or env points at a blocked/wrong price.
 *
 * Usage:
 *   node scripts/verify-membership-pricing.mjs
 *   node scripts/verify-membership-pricing.mjs --env-file .env.vercel.production
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Must match web/src/lib/billing/membershipPricing.js */
const SUPPORT_MEMBERSHIP_ANNUAL_CENTS = 99;
const PRO_MEMBERSHIP_ANNUAL_CENTS = 599;
const INCORRECT_SUPPORT_ANNUAL_CENTS = 9900;
const HARDCODED_BLOCKED_PRICE_IDS = ["price_1TlqQ9CiwOqAGcUDuZkKPlJ2"];
const CURRENCY = "usd";
const INTERVAL = "year";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
if (envFileArg) {
  loadEnvFile(path.resolve(process.cwd(), envFileArg.slice("--env-file=".length)));
} else {
  loadEnvFile(path.join(__dirname, "../.env.local"));
}

const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL ${msg}`);
}

function pass(msg) {
  console.log(`OK   ${msg}`);
}

function blockedIds() {
  const fromEnv = String(process.env.STRIPE_BLOCKED_PRICE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...HARDCODED_BLOCKED_PRICE_IDS, ...fromEnv]);
}

function supportPriceId() {
  return (
    String(process.env.STRIPE_PRICE_SUPPORT_YEARLY || "").trim() ||
    String(process.env.STRIPE_PRICE_SUPPORT_ANNUAL || "").trim()
  );
}

function proPriceId() {
  return (
    String(process.env.STRIPE_PRICE_PRO_YEARLY || "").trim() ||
    String(process.env.STRIPE_PRICE_PRO_MONTHLY || "").trim() ||
    String(process.env.STRIPE_PRICE_MEMBER_MONTHLY || "").trim()
  );
}

async function stripeGet(pathname, key) {
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "stripe_error");
  return data;
}

async function validateConfiguredPrice({ tier, priceId, expectedCents, key }) {
  if (!priceId) {
    fail(`${tier}: no price ID in env (STRIPE_PRICE_SUPPORT_YEARLY / STRIPE_PRICE_PRO_YEARLY)`);
    return;
  }
  if (!priceId.startsWith("price_")) {
    fail(`${tier}: env value is not a price_ ID`);
    return;
  }
  if (blockedIds().has(priceId)) {
    fail(`${tier}: configured price ${priceId} is blocked (known $99 Support mischarge)`);
    return;
  }

  let price;
  try {
    price = await stripeGet(`prices/${priceId}`, key);
  } catch (e) {
    fail(`${tier}: Stripe lookup failed for ${priceId}: ${e.message}`);
    return;
  }

  const amount = price.unit_amount;
  const currency = String(price.currency || "").toLowerCase();
  const interval = price.recurring?.interval ? String(price.recurring.interval).toLowerCase() : "";
  const active = price.active !== false;

  if (!active) fail(`${tier}: Stripe price ${priceId} is inactive`);
  if (currency !== CURRENCY) fail(`${tier}: expected currency ${CURRENCY}, got ${currency || "unknown"}`);
  if (interval !== INTERVAL) fail(`${tier}: expected interval ${INTERVAL}, got ${interval || "none"}`);
  if (amount !== expectedCents) {
    fail(
      `${tier}: amount $${((amount ?? 0) / 100).toFixed(2)}/${interval || "?"} != expected $${(expectedCents / 100).toFixed(2)}/${INTERVAL} (price ${priceId})`,
    );
    return;
  }
  if (amount === INCORRECT_SUPPORT_ANNUAL_CENTS && tier === "support") {
    fail(`${tier}: CRITICAL — env still points at $99/year Support price ${priceId}`);
    return;
  }
  pass(`${tier}: ${priceId} = $${(amount / 100).toFixed(2)}/${interval} (active)`);
}

console.log("[verify:membership-pricing] Canonical amounts (must match membershipPricing.js)");
if (SUPPORT_MEMBERSHIP_ANNUAL_CENTS !== 99) fail("SUPPORT_MEMBERSHIP_ANNUAL_CENTS must be 99");
else pass("Support = $0.99/year (99 cents)");
if (PRO_MEMBERSHIP_ANNUAL_CENTS !== 599) fail("PRO_MEMBERSHIP_ANNUAL_CENTS must be 599");
else pass("Pro = $5.99/year (599 cents)");

const supportId = supportPriceId();
const proId = proPriceId();
const block = blockedIds();
if (supportId && block.has(supportId)) {
  fail(`STRIPE_PRICE_SUPPORT_YEARLY=${supportId} is on the blocked list — update Vercel env before deploy`);
}

const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
if (!key) {
  console.warn("\n[verify:membership-pricing] STRIPE_SECRET_KEY not set — skipping live Stripe validation.");
  console.warn("  Set STRIPE_SECRET_KEY locally or pass --env-file=.env.vercel.production for full check.");
} else {
  console.log("\n[verify:membership-pricing] Live Stripe price validation");
  await validateConfiguredPrice({
    tier: "support",
    priceId: supportId,
    expectedCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
    key,
  });
  await validateConfiguredPrice({
    tier: "pro",
    priceId: proId,
    expectedCents: PRO_MEMBERSHIP_ANNUAL_CENTS,
    key,
  });
}

if (failures.length) {
  console.error(`\n[verify:membership-pricing] ${failures.length} failure(s). Deploy blocked until fixed.`);
  process.exit(1);
}
console.log("\n[verify:membership-pricing] All checks passed.");
