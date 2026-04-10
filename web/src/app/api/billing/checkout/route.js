import { withAuth } from "@workos-inc/authkit-nextjs";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  appBaseUrl,
  priceIdForTier,
  stripeMemberRecurringConfigured,
  stripeSponsorSubscriptionConfigured,
} from "@/lib/billing/stripeConfig";

const PAID = new Set(["support", "member", "sponsor"]);

function safeReturnPath(raw) {
  const p = String(raw || "").trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/profile";
  return p;
}

export async function POST(request) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow) {
    return Response.json(
      {
        error: "profile_required",
        message: "Your account profile was not found. Sign in again or complete onboarding first.",
      },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const tier = String(body.tier || "").toLowerCase();
  if (!PAID.has(tier)) {
    return Response.json({ error: "invalid_tier" }, { status: 400 });
  }

  if (tier === "sponsor") {
    if (!stripeSponsorSubscriptionConfigured()) {
      return Response.json(
        { error: "sponsor_billing_not_configured", message: "Set STRIPE_PRICE_SPONSOR_MONTHLY for sponsor subscription checkout." },
        { status: 503 },
      );
    }
  } else if (!stripeMemberRecurringConfigured()) {
    return Response.json(
      {
        error: "billing_not_configured",
        message: "Set STRIPE_SECRET_KEY, STRIPE_PRICE_SUPPORT_MONTHLY, and STRIPE_PRICE_PRO_MONTHLY (or STRIPE_PRICE_MEMBER_MONTHLY).",
      },
      { status: 503 },
    );
  }

  const priceId = priceIdForTier(tier);
  if (!priceId) {
    return Response.json({ error: "price_not_configured", tier }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const base = appBaseUrl();
  const returnPath = safeReturnPath(body.returnPath);
  const customerId = profileRow.stripe_customer_id ? String(profileRow.stripe_customer_id).trim() : null;
  const profileId = profileRow.id ? String(profileRow.id) : "";

  const metadata = {
    workos_user_id: auth.user.id,
    membership_tier: tier,
    checkout_kind: "membership_subscription",
    ...(profileId ? { torp_profile_id: profileId } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId || undefined,
      customer_email: customerId ? undefined : auth.user.email || undefined,
      client_reference_id: auth.user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${returnPath}?checkout=cancel`,
      metadata,
      subscription_data: {
        metadata,
      },
    });

    if (session.url) {
      return Response.json({ url: session.url });
    }
    return Response.json({ error: "no_checkout_url" }, { status: 500 });
  } catch (e) {
    console.error("[torp] Stripe checkout", e);
    return Response.json({ error: "stripe_error", message: e.message }, { status: 500 });
  }
}
