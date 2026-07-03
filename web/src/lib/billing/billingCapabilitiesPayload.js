import Stripe from "stripe";
import {
  PRO_MEMBERSHIP_ANNUAL_CENTS,
  SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
  membershipCheckoutHardBlock,
  supportCheckoutTemporarilyDisabled,
} from "@/lib/billing/membershipPricing";
import { validateMembershipStripePrice } from "@/lib/billing/stripePriceValidation";
import {
  podcastSponsorCheckoutConfigured,
  podcastSponsorMissingPriceEnvKeys,
  priceIdForTier,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripeCheckoutConfigured,
  stripeSecretConfigured,
  stripeSponsorSubscriptionConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

/** Shared JSON for GET /api/billing/capabilities. */
export async function billingCapabilitiesPayload() {
  const base = {
    ok: true,
    membershipCheckout: stripeMemberRecurringConfigured(),
    membershipCheckoutMissingEnv: stripeMemberRecurringConfigured() ? [] : stripeMemberRecurringMissingEnvKeys(),
    sponsorSubscriptionCheckout: stripeSponsorSubscriptionConfigured(),
    fullMembershipOnboarding: stripeCheckoutConfigured(),
    podcastSponsorCheckout: podcastSponsorCheckoutConfigured(),
    podcastSponsorMissingEnv: podcastSponsorCheckoutConfigured() ? [] : podcastSponsorMissingPriceEnvKeys(),
    stripeWebhook: stripeWebhookConfigured(),
    membershipCheckoutDisabled: membershipCheckoutHardBlock(),
    supportCheckoutDisabled: supportCheckoutTemporarilyDisabled(),
    expectedPricing: {
      supportAnnualCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
      proAnnualCents: PRO_MEMBERSHIP_ANNUAL_CENTS,
      currency: "usd",
      interval: "year",
    },
    tierCheckout: {
      support: { enabled: false, validated: false, priceId: priceIdForTier("support") || null },
      member: { enabled: false, validated: false, priceId: priceIdForTier("member") || null },
    },
  };

  if (!stripeSecretConfigured() || membershipCheckoutHardBlock()) {
    return base;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  for (const tier of ["support", "member"]) {
    const priceId = priceIdForTier(tier);
    if (!priceId) continue;
    const v = await validateMembershipStripePrice(stripe, tier, priceId);
    const tierDisabled =
      tier === "support" && supportCheckoutTemporarilyDisabled();
    base.tierCheckout[tier] = {
      enabled: v.ok && !tierDisabled,
      validated: v.ok,
      priceId,
      unitAmount: v.unitAmount,
      interval: v.interval,
      code: tierDisabled ? "support_checkout_disabled" : v.code || null,
      message: tierDisabled
        ? "Support Membership checkout is temporarily disabled while pricing is verified."
        : v.ok
          ? null
          : v.message || null,
    };
  }

  base.membershipCheckout =
    base.tierCheckout.support.enabled && base.tierCheckout.member.enabled && stripeMemberRecurringConfigured();

  return base;
}
