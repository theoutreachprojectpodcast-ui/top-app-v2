import { isWorkOSConfigured, workOSEnvironmentIssues } from "@/lib/auth/workosConfigured";
import { expectedWorkOSOrganizationId } from "@/lib/auth/workosOrganizationScope";
import { sessionIdleTimeoutMs } from "@/lib/auth/sessionIdle";
import { sharedSessionCookieDomain } from "@/lib/runtime/deploymentHosts";
import { profileTableName } from "@/lib/supabase/admin";
import {
  stripeCheckoutConfigured,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripePublishableConfigured,
  stripeSponsorSubscriptionConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";
import { isDemoModeEnabled } from "@/lib/runtime/launchMode";

export async function GET() {
  const workos = isWorkOSConfigured();
  const profileTable = profileTableName();
  const qaIsolatedProfiles =
    String(process.env.VERCEL_ENV || "").toLowerCase() === "preview"
      ? profileTable !== "torp_profiles"
      : true;
  const orgId = expectedWorkOSOrganizationId();
  const idleMs = sessionIdleTimeoutMs();
  const cookieDomain = sharedSessionCookieDomain() || "";
  return Response.json({
    /** Local demo email/password and related client-only demo paths (see `isDemoModeEnabled`). */
    demoFlowsEnabled: isDemoModeEnabled(),
    workos,
    /** When false, lists what to set in `.env.local` to enable hosted AuthKit (no secret values). */
    workosMissingEnv: workos ? [] : workOSEnvironmentIssues(),
    /** When set, hosted sign-in/up and API sessions are restricted to this WorkOS organization (`org_*`). */
    workosOrganizationIdConfigured: Boolean(orgId),
    workosRedirectUriConfigured: Boolean(
      String(process.env.WORKOS_REDIRECT_URI || process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "").trim(),
    ),
    /** Milliseconds of inactivity before `/sign-out` is triggered; 0 = idle sign-out disabled. */
    sessionIdleTimeoutMs: idleMs,
    workosCookieDomain: cookieDomain,
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
    profileTable,
    qaIsolatedProfiles,
  });
}
