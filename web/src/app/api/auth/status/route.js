import { isWorkOSConfigured, workOSEnvironmentIssues } from "@/lib/auth/workosConfigured";
import { expectedWorkOSOrganizationId } from "@/lib/auth/workosOrganizationScope";
import { sessionIdleTimeoutMs } from "@/lib/auth/sessionIdle";
import { sharedSessionCookieDomain } from "@/lib/runtime/deploymentHosts";
import { profileTableName } from "@/lib/supabase/admin";
import {
  stripeCheckoutConfigured,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripePortalConfigured,
  stripePublishableConfigured,
  stripeSponsorSubscriptionConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";
import { isDemoModeEnabled } from "@/lib/runtime/launchMode";
import { isAdminEmailLoginEnabled, isAdminEmailLoginProductionEnabled } from "@/lib/auth/adminEmailLogin";

export async function GET() {
  const isProduction =
    String(process.env.VERCEL_ENV || "").toLowerCase() === "production" ||
    String(process.env.NODE_ENV || "").toLowerCase() === "production";

  if (isProduction) {
    return Response.json({
      workos: isWorkOSConfigured(),
      stripe: stripeMemberRecurringConfigured(),
      stripePortal: stripePortalConfigured(),
      sessionIdleTimeoutMs: sessionIdleTimeoutMs(),
    });
  }

  const workos = isWorkOSConfigured();
  const profileTable = profileTableName();
  const qaIsolatedProfiles =
    String(process.env.VERCEL_ENV || "").toLowerCase() === "preview"
      ? profileTable !== "top_profiles"
      : true;
  const orgId = expectedWorkOSOrganizationId();
  const idleMs = sessionIdleTimeoutMs();
  const cookieDomain = sharedSessionCookieDomain() || "";
  return Response.json({
    /** Local demo email/password and related client-only demo paths (see `isDemoModeEnabled`). */
    demoFlowsEnabled: isDemoModeEnabled(),
    /** `/admin` magic-link sign-in for approved emails (no WorkOS). QA: demo mode; Production: `ENABLE_ADMIN_EMAIL_LOGIN=1`. */
    adminEmailLogin: isAdminEmailLoginEnabled(),
    adminEmailLoginProduction: isAdminEmailLoginProductionEnabled(),
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
    /** Customer Portal (manage payment method, invoices, plan changes) — secret key only. */
    stripePortal: stripePortalConfigured(),
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
