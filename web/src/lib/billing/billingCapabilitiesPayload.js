import Stripe from "stripe";
import {
  PRO_MEMBERSHIP_ANNUAL_CENTS,
  SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
  membershipCheckoutHardBlock,
  supportCheckoutDisabledAsync,
} from "@/lib/billing/membershipPricing";
import { validateMembershipStripePrice } from "@/lib/billing/stripePriceValidation";
import {
  getMembershipConfiguration,
  listPurchasableMembershipPlans,
} from "@/lib/membership/membershipConfiguration";
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Shared JSON for GET /api/billing/capabilities. */
export async function billingCapabilitiesPayload() {
  const admin = createSupabaseAdminClient();
  const cfg = await getMembershipConfiguration(admin);
  const supportDisabled = await supportCheckoutDisabledAsync(admin);

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
    supportCheckoutDisabled: supportDisabled,
    supportMembershipEnabled: cfg.supportMembershipEnabled === true,
    purchasablePlans: listPurchasableMembershipPlans(cfg),
    membershipConfiguration: {
      supportMembershipEnabled: cfg.supportMembershipEnabled,
      proMembershipEnabled: cfg.proMembershipEnabled,
      updatedAt: cfg.updatedAt,
      source: cfg.source,
    },
    expectedPricing: {
      ...(cfg.supportMembershipEnabled
        ? { supportAnnualCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS }
        : {}),
      proAnnualCents: PRO_MEMBERSHIP_ANNUAL_CENTS,
      currency: "usd",
      interval: "year",
    },
    tierCheckout: {
      support: {
        enabled: false,
        validated: false,
        priceId: cfg.supportMembershipEnabled ? priceIdForTier("support") || null : null,
        code: supportDisabled ? "support_checkout_disabled" : null,
        message: supportDisabled
          ? "Support Membership is not available. Choose Pro Membership."
          : null,
      },
      member: { enabled: false, validated: false, priceId: priceIdForTier("member") || null },
    },
  };

  if (!stripeSecretConfigured() || membershipCheckoutHardBlock()) {
    return base;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const tiersToValidate = cfg.supportMembershipEnabled ? ["support", "member"] : ["member"];
  for (const tier of tiersToValidate) {
    const priceId = priceIdForTier(tier);
    if (!priceId) continue;
    const v = await validateMembershipStripePrice(stripe, tier, priceId, {
      supportEnabled: cfg.supportMembershipEnabled,
    });
    const tierDisabled = tier === "support" && supportDisabled;
    base.tierCheckout[tier] = {
      enabled: v.ok && !tierDisabled,
      validated: v.ok,
      priceId,
      unitAmount: v.unitAmount,
      interval: v.interval,
      code: tierDisabled ? "support_checkout_disabled" : v.code || null,
      message: tierDisabled
        ? "Support Membership is not available. Choose Pro Membership."
        : v.ok
          ? null
          : v.message || null,
    };
  }

  base.membershipCheckout =
    base.tierCheckout.member.enabled &&
    stripeMemberRecurringConfigured() &&
    (cfg.supportMembershipEnabled ? base.tierCheckout.support.enabled : true);

  return base;
}
