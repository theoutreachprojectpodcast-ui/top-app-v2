import {
  podcastSponsorCheckoutConfigured,
  podcastSponsorMissingPriceEnvKeys,
  stripeCheckoutConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

export async function GET() {
  return Response.json({
    membershipCheckout: stripeCheckoutConfigured(),
    podcastSponsorCheckout: podcastSponsorCheckoutConfigured(),
    podcastSponsorMissingEnv: podcastSponsorCheckoutConfigured() ? [] : podcastSponsorMissingPriceEnvKeys(),
    stripeWebhook: stripeWebhookConfigured(),
  });
}
