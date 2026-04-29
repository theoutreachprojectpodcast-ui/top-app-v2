import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { stripePortalReturnUrl, stripeSecretConfigured } from "@/lib/billing/stripeConfig";

export async function POST(request) {
  if (!stripeSecretConfigured()) {
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
  const customerId = row?.stripe_customer_id ? String(row.stripe_customer_id).trim() : "";
  if (!customerId) {
    return Response.json(
      { error: "no_stripe_customer", message: "No billing account on file yet. Subscribe from onboarding first." },
      { status: 400 },
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const returnUrl = stripePortalReturnUrl(request);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    if (session.url) {
      return Response.json({ url: session.url });
    }
    return Response.json({ error: "no_portal_url" }, { status: 500 });
  } catch (e) {
    console.error("[torp] Stripe portal", e);
    return Response.json({ error: "stripe_error", message: e.message }, { status: 500 });
  }
}
