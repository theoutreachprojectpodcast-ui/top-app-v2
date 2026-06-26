/**
 * Canonical membership pricing (USD, yearly). Server-side source of truth for checkout validation.
 * UI labels must match these amounts.
 */

/** Support Membership — $0.99/year */
export const SUPPORT_MEMBERSHIP_ANNUAL_CENTS = 99;

/** Pro Membership — $5.99/year */
export const PRO_MEMBERSHIP_ANNUAL_CENTS = 599;

/** Incorrect Support charge from 2026-06 production incident ($99/year). */
export const INCORRECT_SUPPORT_ANNUAL_CENTS = 9900;

/** Partial refund for mischarge: $99.00 − $0.99 */
export const SUPPORT_MISCHARGE_REFUND_CENTS = INCORRECT_SUPPORT_ANNUAL_CENTS - SUPPORT_MEMBERSHIP_ANNUAL_CENTS;

export const MEMBERSHIP_PRICING_CURRENCY = "usd";

export const MEMBERSHIP_BILLING_INTERVAL = "year";

/**
 * Known live Stripe price IDs that must never be used for Support checkout (production incident).
 * Extend via STRIPE_BLOCKED_PRICE_IDS env (comma-separated price_…).
 */
export const HARDCODED_BLOCKED_MEMBERSHIP_PRICE_IDS = [
  "price_1TlqQ9CiwOqAGcUDuZkKPlJ2",
];

/** @param {string} tier */
export function expectedAnnualCentsForTier(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "support" || t === "access") return SUPPORT_MEMBERSHIP_ANNUAL_CENTS;
  if (t === "member") return PRO_MEMBERSHIP_ANNUAL_CENTS;
  return null;
}

/** @returns {Set<string>} */
export function blockedMembershipPriceIds() {
  const fromEnv = String(process.env.STRIPE_BLOCKED_PRICE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...HARDCODED_BLOCKED_MEMBERSHIP_PRICE_IDS, ...fromEnv]);
}

export function supportCheckoutTemporarilyDisabled() {
  return String(process.env.STRIPE_SUPPORT_CHECKOUT_DISABLED || "").trim() === "1";
}

export function membershipCheckoutHardBlock() {
  return String(process.env.STRIPE_MEMBERSHIP_CHECKOUT_DISABLED || "").trim() === "1";
}
