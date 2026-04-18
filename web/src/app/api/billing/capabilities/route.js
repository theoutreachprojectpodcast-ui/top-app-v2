import {
  podcastSponsorCheckoutConfigured,
  podcastSponsorMissingPriceEnvKeys,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripeCheckoutConfigured,
  stripeSponsorSubscriptionConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

export async function GET() {
  return Response.json({
    membershipCheckout: stripeMemberRecurringConfigured(),
    membershipCheckoutMissingEnv: stripeMemberRecurringConfigured() ? [] : stripeMemberRecurringMissingEnvKeys(),
    sponsorSubscriptionCheckout: stripeSponsorSubscriptionConfigured(),
    fullMembershipOnboarding: stripeCheckoutConfigured(),
    podcastSponsorCheckout: podcastSponsorCheckoutConfigured(),
    podcastSponsorMissingEnv: podcastSponsorCheckoutConfigured() ? [] : podcastSponsorMissingPriceEnvKeys(),
    stripeWebhook: stripeWebhookConfigured(),
  });
}
