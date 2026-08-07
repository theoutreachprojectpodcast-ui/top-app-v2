import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { bulkCheckoutSchema } from "@/lib/security/schemas/bulkLicensingSchemas";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  bulkCheckoutConfigured,
  bulkPriceIdForPackageSize,
  requestOriginForStripeRedirects,
  safeAppReturnPath,
} from "@/lib/billing/stripeConfig";
import { validateBusinessCode } from "@/lib/bulkLicensing/businessCode";
import { deploymentProfile } from "@/lib/runtime/appUrls";

export const runtime = "nodejs";

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "bulk-licensing-checkout", limit: 10 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  if (!bulkCheckoutConfigured()) {
    return Response.json(
      {
        error: "bulk_billing_not_configured",
        message:
          "Set STRIPE_SECRET_KEY and STRIPE_BULK_25/50/100/200_PRICE_ID for bulk license checkout.",
      },
      { status: 503 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, user.id);
  if (!profileRow) {
    return Response.json(
      { error: "profile_required", message: "Complete sign-in before purchasing bulk licenses." },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, bulkCheckoutSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);
  const body = parsed.data;

  const codeResult = validateBusinessCode(body.businessCode);
  if (!codeResult.ok) {
    return Response.json(
      { error: codeResult.error, message: codeResult.message },
      { status: 400 },
    );
  }

  const { data: existingCode } = await admin
    .from("bulk_organizations")
    .select("id")
    .eq("business_code", codeResult.code)
    .maybeSingle();
  if (existingCode) {
    return Response.json(
      {
        error: "business_code_taken",
        message: "That business code is already in use. Choose another.",
      },
      { status: 409 },
    );
  }

  const priceId = bulkPriceIdForPackageSize(body.packageSize);
  if (!priceId) {
    return Response.json({ error: "price_not_configured", packageSize: body.packageSize }, { status: 503 });
  }

  const billingEmail = String(body.billingEmail || body.workEmail).trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: org, error: orgErr } = await admin
    .from("bulk_organizations")
    .insert({
      name: body.organizationName.trim(),
      business_code: codeResult.code,
      primary_admin_user_id: user.id,
      purchaser_name: body.purchaserName.trim(),
      purchaser_email: body.workEmail.trim().toLowerCase(),
      billing_email: billingEmail,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      organization_type: body.organizationType?.trim() || null,
      purchase_order_ref: body.purchaseOrderRef?.trim() || null,
      status: "pending_payment",
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (orgErr || !org) {
    console.error("[bulk] org create failed", orgErr?.message, orgErr?.code, orgErr?.details);
    const msg = String(orgErr?.message || "");
    if (/permission denied|42501/i.test(msg)) {
      return Response.json(
        {
          error: "organization_create_failed",
          message:
            "Bulk licensing tables are missing service_role grants. Run web/supabase/bulk_licensing_grant_service_role_v01.sql in Supabase.",
          code: orgErr?.code || "42501",
        },
        { status: 500 },
      );
    }
    if (/does not exist|PGRST205|Could not find the table/i.test(msg)) {
      return Response.json(
        {
          error: "organization_create_failed",
          message:
            "Bulk licensing schema is not applied. Run web/supabase/bulk_licensing_v01.sql in Supabase.",
          code: orgErr?.code || "schema_missing",
        },
        { status: 500 },
      );
    }
    return Response.json(
      {
        error: "organization_create_failed",
        message: msg || "Could not create the organization. Try again or contact support.",
        code: orgErr?.code || null,
      },
      { status: 500 },
    );
  }

  await admin.from("bulk_organization_members").insert({
    organization_id: org.id,
    workos_user_id: user.id,
    email: body.workEmail.trim().toLowerCase(),
    role: "owner",
    status: "active",
    invited_by: user.id,
    updated_at: now,
  });

  const { data: purchase, error: purchaseErr } = await admin
    .from("bulk_pending_purchases")
    .insert({
      organization_id: org.id,
      workos_user_id: user.id,
      package_size: body.packageSize,
      stripe_price_id: priceId,
      status: "pending",
      agreed_auto_renewal: true,
      agreed_license_terms: true,
      purchase_order_ref: body.purchaseOrderRef?.trim() || null,
      deployment_profile: deploymentProfile(),
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (purchaseErr || !purchase) {
    console.error("[bulk] purchase create failed", purchaseErr?.message);
    return Response.json({ error: "purchase_create_failed" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const base = requestOriginForStripeRedirects(request);
  const successPath = safeAppReturnPath(
    `/bulk-licenses/success?organizationId=${org.id}`,
    `/bulk-licenses/success?organizationId=${org.id}`,
  );
  const cancelPath = safeAppReturnPath(
    `/bulk-licenses?checkout=canceled&org=${org.id}`,
    "/bulk-licenses",
  );

  const metadata = {
    checkout_kind: "bulk_licensing",
    bulk_organization_id: org.id,
    bulk_purchase_id: purchase.id,
    package_size: String(body.packageSize),
    workos_user_id: user.id,
    deployment_profile: deploymentProfile(),
    business_code: codeResult.code,
  };

  /** @type {import('stripe').Stripe.Checkout.SessionCreateParams} */
  const sessionParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}${successPath}`,
    cancel_url: `${base}${cancelPath}`,
    client_reference_id: purchase.id,
    metadata,
    subscription_data: {
      metadata,
    },
    customer_email: billingEmail,
  };

  let session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    console.error("[bulk] checkout session failed", err instanceof Error ? err.message : err);
    await admin
      .from("bulk_pending_purchases")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", purchase.id);
    return Response.json({ error: "stripe_checkout_failed" }, { status: 502 });
  }

  await admin
    .from("bulk_pending_purchases")
    .update({
      stripe_checkout_session_id: session.id,
      status: "checkout_created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchase.id);

  return Response.json({
    ok: true,
    url: session.url,
    organizationId: org.id,
    purchaseId: purchase.id,
  });
}
