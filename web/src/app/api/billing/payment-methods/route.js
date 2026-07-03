import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  requestOriginForStripeRedirects,
  safeAppReturnPath,
  stripeSecretConfigured,
} from "@/lib/billing/stripeConfig";
import { resolveStripeCustomerForProfile } from "@/lib/billing/stripeCustomerResolve";
import { paymentMethodToSummary } from "@/lib/billing/stripeProfileSync";
import { z } from "zod";

const setDefaultSchema = z.object({
  paymentMethodId: z.string().min(1).max(200),
});

export async function GET(request) {
  const guard = guardMutation(request, { rateKey: "billing-pm-list", limit: 40 });
  if (!guard.ok) return guardFailureResponse(guard);
  if (!stripeSecretConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  const customerId = row?.stripe_customer_id ? String(row.stripe_customer_id).trim() : "";
  if (!customerId) {
    return Response.json({ paymentMethods: [], defaultPaymentMethodId: null });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const customer = await stripe.customers.retrieve(customerId);
  const defaultId =
    !customer.deleted && customer.invoice_settings?.default_payment_method
      ? typeof customer.invoice_settings.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method?.id
      : null;

  const list = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  const paymentMethods = list.data.map((pm) => ({
    id: pm.id,
    isDefault: pm.id === defaultId,
    summary: paymentMethodToSummary(pm),
  }));

  return Response.json({ paymentMethods, defaultPaymentMethodId: defaultId });
}

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "billing-pm-setup", limit: 15 });
  if (!guard.ok) return guardFailureResponse(guard);
  if (!stripeSecretConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!row) {
    return Response.json({ error: "profile_required" }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const resolved = await resolveStripeCustomerForProfile(admin, stripe, auth.user, row);
  if (!resolved.ok) {
    return Response.json(
      { error: resolved.error, message: resolved.message || "Could not add payment method." },
      { status: 500 },
    );
  }
  const customerId = resolved.customerId;

  const base = requestOriginForStripeRedirects(request);
  const returnPath = safeAppReturnPath(body.returnPath || "", "/profile");

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${base}${returnPath}?payment_method=success`,
    cancel_url: `${base}${returnPath}?payment_method=cancel`,
    metadata: { workos_user_id: auth.user.id, checkout_kind: "payment_method_setup" },
  });

  if (session.url) {
    return Response.json({ url: session.url });
  }
  return Response.json({ error: "no_checkout_url" }, { status: 500 });
}

export async function PATCH(request) {
  const guard = guardMutation(request, { rateKey: "billing-pm-default", limit: 20 });
  if (!guard.ok) return guardFailureResponse(guard);
  if (!stripeSecretConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const parsed = await parseJsonBody(request, setDefaultSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);

  const admin = createSupabaseAdminClient();
  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  const customerId = row?.stripe_customer_id ? String(row.stripe_customer_id).trim() : "";
  if (!customerId) {
    return Response.json({ error: "no_stripe_customer" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const pmId = parsed.data.paymentMethodId;

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pmId },
  });
  await syncPaymentMethodSummaryOnly(admin, stripe, auth.user.id, customerId);

  const summary = await fetchDefaultPaymentMethodSummary(stripe, customerId);
  return Response.json({ ok: true, paymentMethodSummary: summary });
}

export async function DELETE(request) {
  const guard = guardMutation(request, { rateKey: "billing-pm-detach", limit: 20 });
  if (!guard.ok) return guardFailureResponse(guard);
  if (!stripeSecretConfigured()) {
    return Response.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const pmId = new URL(request.url).searchParams.get("id")?.trim();
  if (!pmId) {
    return Response.json({ error: "payment_method_id_required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  const customerId = row?.stripe_customer_id ? String(row.stripe_customer_id).trim() : "";
  if (!customerId) {
    return Response.json({ error: "no_stripe_customer" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const pm = await stripe.paymentMethods.retrieve(pmId);
  if (pm.customer !== customerId) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  await stripe.paymentMethods.detach(pmId);
  await syncPaymentMethodSummaryOnly(admin, stripe, auth.user.id, customerId);

  return Response.json({ ok: true });
}
