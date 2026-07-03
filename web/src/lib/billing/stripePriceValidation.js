import {
  MEMBERSHIP_BILLING_INTERVAL,
  MEMBERSHIP_PRICING_CURRENCY,
  blockedMembershipPriceIds,
  expectedAnnualCentsForTier,
  membershipCheckoutHardBlock,
  supportCheckoutTemporarilyDisabled,
} from "@/lib/billing/membershipPricing";

/**
 * @typedef {{
 *   ok: boolean,
 *   tier: string,
 *   priceId: string,
 *   unitAmount: number | null,
 *   currency: string | null,
 *   interval: string | null,
 *   expectedCents: number | null,
 *   blocked: boolean,
 *   code?: string,
 *   message?: string,
 * }} MembershipPriceValidation
 */

/**
 * @param {import('stripe').Stripe} stripe
 * @param {string} tier
 * @param {string} priceId
 * @returns {Promise<MembershipPriceValidation>}
 */
export async function validateMembershipStripePrice(stripe, tier, priceId) {
  const t = String(tier || "").toLowerCase();
  const id = String(priceId || "").trim();
  const expectedCents = expectedAnnualCentsForTier(t);

  const base = {
    ok: false,
    tier: t,
    priceId: id,
    unitAmount: null,
    currency: null,
    interval: null,
    expectedCents,
    blocked: false,
  };

  if (membershipCheckoutHardBlock()) {
    return {
      ...base,
      code: "checkout_disabled",
      message: "Membership checkout is temporarily disabled.",
    };
  }

  if ((t === "support" || t === "access") && supportCheckoutTemporarilyDisabled()) {
    return {
      ...base,
      code: "support_checkout_disabled",
      message: "Support Membership checkout is temporarily disabled while pricing is verified.",
    };
  }

  if (!id || !id.startsWith("price_")) {
    return { ...base, code: "invalid_price_id", message: "Missing or invalid Stripe price ID." };
  }

  if (blockedMembershipPriceIds().has(id)) {
    return {
      ...base,
      blocked: true,
      code: "blocked_price_id",
      message: "This Stripe price ID is blocked due to a known pricing incident.",
    };
  }

  if (expectedCents == null) {
    return { ...base, ok: true, code: "tier_not_validated" };
  }

  let price;
  try {
    price = await stripe.prices.retrieve(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...base, code: "stripe_price_lookup_failed", message: msg };
  }

  const unitAmount = typeof price.unit_amount === "number" ? price.unit_amount : null;
  const currency = price.currency ? String(price.currency).toLowerCase() : null;
  const interval = price.recurring?.interval ? String(price.recurring.interval).toLowerCase() : null;
  const active = price.active !== false;

  const result = {
    ...base,
    unitAmount,
    currency,
    interval,
  };

  if (!active) {
    return { ...result, code: "price_inactive", message: "Stripe price is not active." };
  }

  if (currency !== MEMBERSHIP_PRICING_CURRENCY) {
    return {
      ...result,
      code: "currency_mismatch",
      message: `Expected currency ${MEMBERSHIP_PRICING_CURRENCY}, got ${currency || "unknown"}.`,
    };
  }

  if (interval !== MEMBERSHIP_BILLING_INTERVAL) {
    return {
      ...result,
      code: "interval_mismatch",
      message: `Expected billing interval ${MEMBERSHIP_BILLING_INTERVAL}, got ${interval || "none"}.`,
    };
  }

  if (unitAmount !== expectedCents) {
    console.error("[top] CRITICAL billing price mismatch", {
      tier: t,
      priceId: id,
      unitAmount,
      expectedCents,
      nickname: price.nickname,
    });
    return {
      ...result,
      code: "amount_mismatch",
      message: `Price amount ${((unitAmount ?? 0) / 100).toFixed(2)} does not match expected ${(expectedCents / 100).toFixed(2)}/${MEMBERSHIP_BILLING_INTERVAL}.`,
    };
  }

  return { ...result, ok: true };
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {string} tier
 * @param {string} priceId
 */
export async function assertMembershipPriceOrThrow(stripe, tier, priceId) {
  const v = await validateMembershipStripePrice(stripe, tier, priceId);
  if (!v.ok) {
    const err = new Error(v.message || v.code || "price_validation_failed");
    err.code = v.code;
    err.validation = v;
    throw err;
  }
  return v;
}
