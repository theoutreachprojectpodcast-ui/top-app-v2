import {
  podcastSponsorCheckoutConfigured,
  podcastSponsorMissingPriceEnvKeys,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripeCheckoutConfigured,
  stripeSponsorSubscriptionConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

/** Shared JSON for GET /api/billing/capabilities and optional mirrors. */
export function billingCapabilitiesPayload() {
  return {
    ok: true,
    membershipCheckout: stripeMemberRecurringConfigured(),
    membershipCheckoutMissingEnv: stripeMemberRecurringConfigured() ? [] : stripeMemberRecurringMissingEnvKeys(),
    sponsorSubscriptionCheckout: stripeSponsorSubscriptionConfigured(),
    fullMembershipOnboarding: stripeCheckoutConfigured(),
    podcastSponsorCheckout: podcastSponsorCheckoutConfigured(),
    podcastSponsorMissingEnv: podcastSponsorCheckoutConfigured() ? [] : podcastSponsorMissingPriceEnvKeys(),
    stripeWebhook: stripeWebhookConfigured(),
  };
}
