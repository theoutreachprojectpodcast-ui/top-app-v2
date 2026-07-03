import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { membershipCheckoutSchema } from "@/lib/security/schemas/billingSchemas";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  priceIdForTier,
  requestOriginForStripeRedirects,
  safeAppReturnPath,
  stripeMemberRecurringConfigured,
  stripeSponsorSubscriptionConfigured,
  supportSubscriptionPriceId,
} from "@/lib/billing/stripeConfig";
import { getSponsorOpportunityById } from "@/lib/billing/sponsorOpportunities";
import { isUpgrade, membershipTierRank } from "@/lib/billing/membershipTierOrder";
import { tierFromProfileRow } from "@/lib/billing/stripeProfileSync";
import { validateMembershipStripePrice } from "@/lib/billing/stripePriceValidation";

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "billing-checkout", limit: 20 });
  if (!guard.ok) return guardFailureResponse(guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, user.id);
  if (!profileRow) {
    return Response.json(
      {
        error: "profile_required",
        message: "Your account profile was not found. Sign in again or complete onboarding first.",
      },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, membershipCheckoutSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);
  const body = parsed.data;
  const tier = body.tier;
  const sponsorPackageId = body.sponsorPackageId ? String(body.sponsorPackageId).trim() : "";

  const currentTier = tierFromProfileRow(profileRow);
  if (!isUpgrade(currentTier, tier) && membershipTierRank(tier) <= membershipTierRank(currentTier)) {
    if (profileRow.stripe_subscription_id && membershipTierRank(tier) < membershipTierRank(currentTier)) {
      return Response.json(
        {
          error: "use_billing_portal",
          message: "To downgrade or cancel, open Manage billing — access continues through the end of your billing period.",
        },
        { status: 400 },
      );
    }
    if (membershipTierRank(tier) === membershipTierRank(currentTier) && profileRow.stripe_subscription_id) {
      return Response.json(
        { error: "already_subscribed", message: "You already have an active subscription for this tier." },
        { status: 400 },
      );
    }
  }

  if (tier === "access") {
    if (!supportSubscriptionPriceId()) {
      return Response.json(
        {
          error: "billing_not_configured",
          message: "Set STRIPE_PRICE_SUPPORT_YEARLY (or legacy STRIPE_PRICE_ACCESS_YEARLY) for Support Membership checkout.",
        },
        { status: 503 },
      );
    }
  } else if (tier === "sponsor") {
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
        message: "Set STRIPE_SECRET_KEY, STRIPE_PRICE_SUPPORT_YEARLY, and STRIPE_PRICE_PRO_YEARLY (or monthly fallbacks).",
      },
      { status: 503 },
    );
  }

  const priceId = priceIdForTier(tier);
  if (!priceId) {
    return Response.json({ error: "price_not_configured", tier }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const priceValidation = await validateMembershipStripePrice(stripe, tier, priceId);
  if (!priceValidation.ok) {
    console.error("[top] CRITICAL checkout blocked — membership price validation failed", priceValidation);
    return Response.json(
      {
        error: priceValidation.code || "price_validation_failed",
        message: priceValidation.message || "Membership checkout is unavailable due to a pricing configuration error.",
        tier,
      },
      { status: 503 },
    );
  }

  const base = requestOriginForStripeRedirects(request);
  const returnPath = safeAppReturnPath(body.returnPath || "", "/profile");
  const customerId = profileRow.stripe_customer_id ? String(profileRow.stripe_customer_id).trim() : null;
  const profileId = profileRow.id ? String(profileRow.id) : "";

  const sponsorOpp = sponsorPackageId ? getSponsorOpportunityById(sponsorPackageId) : null;
  if (tier === "sponsor" && sponsorPackageId && sponsorOpp?.checkoutKind === "one_time" && sponsorOpp.podcastTierId) {
    return Response.json(
      {
        error: "use_podcast_checkout",
        podcastTierId: sponsorOpp.podcastTierId,
        message: "This sponsor package uses one-time podcast checkout.",
      },
      { status: 400 },
    );
  }
  if (tier === "sponsor" && sponsorPackageId && sponsorOpp?.checkoutKind === "application") {
    return Response.json(
      {
        error: "use_sponsor_application",
        missionTierId: sponsorOpp.missionTierId || sponsorPackageId,
        message: "This sponsor package uses the mission partner application flow.",
      },
      { status: 400 },
    );
  }

  const metadata = {
    workos_user_id: user.id,
    membership_tier: tier,
    checkout_kind: "membership_subscription",
    ...(sponsorPackageId ? { sponsor_package_id: sponsorPackageId } : {}),
    ...(profileId ? { top_profile_id: profileId } : {}),
  };

  try {
    console.info("[top] Stripe checkout create", {
      workosUserId: user.id,
      tier,
      priceId,
      returnPath,
      profileId: profileId || null,
    });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email || undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${returnPath}?checkout=cancel`,
      metadata,
      subscription_data: {
        metadata,
      },
    });

    if (session.url) {
      console.info("[top] Stripe checkout session", {
        workosUserId: user.id,
        tier,
        sessionId: session.id,
      });
      return Response.json({ url: session.url });
    }
    return Response.json({ error: "no_checkout_url" }, { status: 500 });
  } catch (e) {
    console.error("[top] Stripe checkout", e);
    return Response.json({ error: "stripe_error", message: e.message }, { status: 500 });
  }
}
