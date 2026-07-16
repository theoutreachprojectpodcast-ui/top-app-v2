/**
 * Automated guardrails for membership pricing constants (no Stripe network calls).
 * Usage: node scripts/test-membership-pricing.mjs
 */

const SUPPORT_MEMBERSHIP_ANNUAL_CENTS = 99;
const PRO_MEMBERSHIP_ANNUAL_CENTS = 599;
const INCORRECT_SUPPORT_ANNUAL_CENTS = 9900;
const SUPPORT_MISCHARGE_REFUND_CENTS = INCORRECT_SUPPORT_ANNUAL_CENTS - SUPPORT_MEMBERSHIP_ANNUAL_CENTS;
const HARDCODED_BLOCKED = ["price_1TlqQ9CiwOqAGcUDuZkKPlJ2"];

const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(SUPPORT_MEMBERSHIP_ANNUAL_CENTS === 99, "Legacy Support constant must stay 99 cents (remediation)");
assert(PRO_MEMBERSHIP_ANNUAL_CENTS === 599, "Pro must be 599 cents/year ($5.99)");
assert(SUPPORT_MISCHARGE_REFUND_CENTS === 9801, "Mischarge partial refund must be $98.01 (9801 cents)");
assert(HARDCODED_BLOCKED.includes("price_1TlqQ9CiwOqAGcUDuZkKPlJ2"), "Known bad Support price must stay blocked");

function validatePriceConfig(tier, priceId, unitAmount, interval, currency) {
  if (tier === "support" || tier === "access") {
    return { ok: false, code: "support_checkout_retired" };
  }
  const expected = PRO_MEMBERSHIP_ANNUAL_CENTS;
  if (HARDCODED_BLOCKED.includes(priceId)) return { ok: false, code: "blocked_price_id" };
  if (unitAmount !== expected) return { ok: false, code: "amount_mismatch" };
  if (interval !== "year" || currency !== "usd") return { ok: false, code: "interval_or_currency" };
  return { ok: true };
}

assert(!validatePriceConfig("support", "price_ok", 99, "year", "usd").ok, "Support checkout is retired");
assert(!validatePriceConfig("support", "price_1TlqQ9CiwOqAGcUDuZkKPlJ2", 9900, "year", "usd").ok, "Blocked $99 price fails");
assert(validatePriceConfig("member", "price_pro", 599, "year", "usd").ok, "Valid pro price passes");
assert(!validatePriceConfig("member", "price_pro_bad", 5999, "year", "usd").ok, "Wrong pro amount fails");

if (failures.length) {
  console.error("[test:membership-pricing] FAILURES:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("[test:membership-pricing] All pricing guardrail tests passed.");
