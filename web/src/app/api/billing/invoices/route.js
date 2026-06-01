import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { stripeSecretConfigured } from "@/lib/billing/stripeConfig";

export async function GET(request) {
  const guard = guardMutation(request, { rateKey: "billing-invoices", limit: 40 });
  if (!guard.ok) return guardFailureResponse(guard);
  if (!stripeSecretConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  const customerId = row?.stripe_customer_id ? String(row.stripe_customer_id).trim() : "";
  if (!customerId) {
    return Response.json({ invoices: [] });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const limit = Math.min(24, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 12));

  try {
    const list = await stripe.invoices.list({ customer: customerId, limit });
    const invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number || "",
      status: inv.status,
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
      invoicePdf: inv.invoice_pdf || null,
      membershipTier: inv.subscription_details?.metadata?.membership_tier || inv.metadata?.membership_tier || null,
    }));
    return Response.json({ invoices });
  } catch (e) {
    console.error("[torp] billing invoices", e);
    return Response.json({ error: "stripe_error", message: e.message }, { status: 500 });
  }
}
