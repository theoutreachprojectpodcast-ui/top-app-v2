import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import {
  podcastSponsorCheckoutConfigured,
  podcastSponsorPriceIdForTier,
  requestOriginForStripeRedirects,
  safeAppReturnPath,
} from "@/lib/billing/stripeConfig";
import {
  createGooglePlayExternalCheckoutHandoffUrl,
  googlePlayExternalContentLinkMetadata,
  normalizeGooglePlayExternalTransactionToken,
} from "@/lib/billing/googlePlayExternalContentLinks.server";

function isGooglePlayExternalContentLinksShell(request) {
  const userAgent = String(request.headers.get("user-agent") || "");
  return (
    /Android/i.test(userAgent) &&
    /TheOutreachProject\/Capacitor/i.test(userAgent) &&
    /GooglePlayECL\/1/i.test(userAgent)
  );
}

export async function POST(request) {
  const __guard = guardMutation(request, { rateKey: "billing-podcast-checkout", limit: 12 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  if (!podcastSponsorCheckoutConfigured()) {
    return Response.json({ error: "podcast_billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  let googlePlayExternalTransactionToken = "";
  try {
    googlePlayExternalTransactionToken = normalizeGooglePlayExternalTransactionToken(
      body.googlePlayExternalTransactionToken,
    );
  } catch {
    return Response.json(
      {
        error: "invalid_google_play_external_transaction_token",
        message: "Google Play returned an invalid external checkout token. Please try again.",
      },
      { status: 400 },
    );
  }
  if (isGooglePlayExternalContentLinksShell(request) && !googlePlayExternalTransactionToken) {
    return Response.json(
      {
        error: "google_play_external_transaction_token_required",
        message: "Google Play must authorize external checkout before the payment page can open.",
      },
      { status: 400 },
    );
  }

  const podcastTierId = String(body.podcastTierId || "").trim();
  const priceId = podcastSponsorPriceIdForTier(podcastTierId);
  if (!priceId) {
    return Response.json({ error: "invalid_podcast_tier", tier: podcastTierId }, { status: 400 });
  }

  const base = requestOriginForStripeRedirects(request);
  const safeReturn = safeAppReturnPath(body.returnPath, "/podcasts");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const metadata = {
    checkout_kind: "podcast_sponsor",
    podcast_tier_id: podcastTierId,
    workos_user_id: user.id,
    ...googlePlayExternalContentLinkMetadata(googlePlayExternalTransactionToken),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${safeReturn}?sponsor_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${safeReturn}?sponsor_checkout=cancel`,
      metadata,
    });

    if (session.url) {
      if (googlePlayExternalTransactionToken) {
        const handoffUrl = createGooglePlayExternalCheckoutHandoffUrl(base, session.id);
        return Response.json({
          checkoutMode: "google_play_external_content_link",
          url: handoffUrl,
          googlePlayExternalLinkUrl: handoffUrl,
        });
      }
      return Response.json({ checkoutMode: "stripe", url: session.url });
    }
    return Response.json({ error: "no_checkout_url" }, { status: 500 });
  } catch (e) {
    console.error("[top] podcast sponsor checkout", e);
    return Response.json({ error: "stripe_error", message: e.message }, { status: 500 });
  }
}
