import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { billingPortalSchema } from "@/lib/security/schemas/billingSchemas";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { resolveStripeCustomerForProfile } from "@/lib/billing/stripeCustomerResolve";
import {
  requestOriginForStripeRedirects,
  safeAppReturnPath,
  stripeBillingPortalConfigurationId,
  stripePortalConfigured,
} from "@/lib/billing/stripeConfig";

export async function POST(request) {
  const __guard = guardMutation(request, { rateKey: "billing-portal", limit: 20 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  if (!stripePortalConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const row = await getProfileRowByWorkOSId(admin, user.id);
  if (!row) {
    return Response.json(
      { error: "profile_required", message: "Your account profile was not found. Sign in again or complete onboarding first." },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, billingPortalSchema);
  const body = parsed.ok ? parsed.data : {};

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const resolved = await resolveStripeCustomerForProfile(admin, stripe, user, row);
  if (!resolved.ok) {
    return Response.json(
      { error: resolved.error, message: resolved.message || "Could not open billing portal." },
      { status: 500 },
    );
  }

  const base = requestOriginForStripeRedirects(request);
  const returnPath = safeAppReturnPath(body.returnPath || "", "/profile");
  const returnUrl = `${base}${returnPath}`;

  const portalConfigId = stripeBillingPortalConfigurationId();
  const subscriptionId = row.stripe_subscription_id ? String(row.stripe_subscription_id).trim() : "";

  try {
    /** @type {import('stripe').Stripe.BillingPortal.SessionCreateParams} */
    const params = {
      customer: resolved.customerId,
      return_url: returnUrl,
    };
    if (portalConfigId) {
      params.configuration = portalConfigId;
    }

    const session = await stripe.billingPortal.sessions.create(params);
    if (session.url) {
      return Response.json({ url: session.url, subscriptionLinked: !!subscriptionId });
    }
    return Response.json({ error: "no_portal_url" }, { status: 500 });
  } catch (e) {
    console.error("[top] Stripe portal", e);
    const msg = String(e?.message || "");
    if (msg.toLowerCase().includes("portal") && msg.toLowerCase().includes("not enabled")) {
      return Response.json(
        {
          error: "portal_not_enabled",
          message:
            "Stripe Customer Portal is not enabled for this account. Ask an admin to enable it in the Stripe Dashboard under Billing → Customer portal.",
        },
        { status: 503 },
      );
    }
    return Response.json({ error: "stripe_error", message: msg || "Could not open billing portal." }, { status: 500 });
  }
}
