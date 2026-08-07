import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
} from "@/lib/security/secureRoute";
import { bulkPortalSchema } from "@/lib/security/schemas/bulkLicensingSchemas";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOrgAccess } from "@/lib/bulkLicensing/authorization";
import {
  requestOriginForStripeRedirects,
  safeAppReturnPath,
  stripeBillingPortalConfigurationId,
  stripePortalConfigured,
} from "@/lib/billing/stripeConfig";

export const runtime = "nodejs";

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "bulk-licensing-portal", limit: 20 });
  if (!guard.ok) return guardFailureResponse(guard);
  if (!stripePortalConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const organizationId = String(url.searchParams.get("organizationId") || "").trim();
  if (!organizationId) {
    return Response.json({ error: "organization_id_required" }, { status: 400 });
  }

  const access = await requireOrgAccess(admin, organizationId, auth.user.id, {
    requireBilling: true,
  });
  if (!access.ok) {
    return Response.json({ error: access.error, message: access.message }, { status: 403 });
  }

  const { data: sub } = await admin
    .from("bulk_subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerId = String(sub?.stripe_customer_id || "").trim();
  if (!customerId) {
    return Response.json(
      { error: "no_stripe_customer", message: "No Stripe customer is linked to this organization yet." },
      { status: 400 },
    );
  }

  const parsed = await parseJsonBody(request, bulkPortalSchema);
  const body = parsed.ok ? parsed.data : {};
  const base = requestOriginForStripeRedirects(request);
  const returnPath = safeAppReturnPath(
    body.returnPath || `/organizations/${organizationId}`,
    `/organizations/${organizationId}`,
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  /** @type {import('stripe').Stripe.BillingPortal.SessionCreateParams} */
  const params = {
    customer: customerId,
    return_url: `${base}${returnPath}`,
  };
  const portalConfigId = stripeBillingPortalConfigurationId();
  if (portalConfigId) params.configuration = portalConfigId;

  try {
    const session = await stripe.billingPortal.sessions.create(params);
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("[bulk] portal", e instanceof Error ? e.message : e);
    return Response.json({ error: "portal_failed" }, { status: 502 });
  }
}
