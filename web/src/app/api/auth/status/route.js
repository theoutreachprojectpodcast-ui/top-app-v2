import { isWorkOSConfigured, workOSEnvironmentIssues } from "@/lib/auth/workosConfigured";
import {
  stripeCheckoutConfigured,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripePublishableConfigured,
  stripeSponsorSubscriptionConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

export async function GET() {
  const workos = isWorkOSConfigured();
  return Response.json({
    workos,
    /** When false, lists what to set in `.env.local` to enable hosted AuthKit (no secret values). */
    workosMissingEnv: workos ? [] : workOSEnvironmentIssues(),
    /** Support + Pro recurring checkout available (profile + most onboarding paid tiers). */
    stripe: stripeMemberRecurringConfigured(),
    stripeMemberRecurring: stripeMemberRecurringConfigured(),
    stripeMemberRecurringMissingEnv: stripeMemberRecurringConfigured() ? [] : stripeMemberRecurringMissingEnvKeys(),
    stripeSponsorSubscription: stripeSponsorSubscriptionConfigured(),
    /** All onboarding paid tiers including sponsor subscription price. */
    stripeFullOnboarding: stripeCheckoutConfigured(),
    stripePublishable: stripePublishableConfigured(),
    stripeWebhook: stripeWebhookConfigured(),
    supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
