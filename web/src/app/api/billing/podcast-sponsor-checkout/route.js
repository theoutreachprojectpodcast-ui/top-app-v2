import { withAuth } from "@workos-inc/authkit-nextjs";
import Stripe from "stripe";
import {
  appBaseUrl,
  podcastSponsorCheckoutConfigured,
  podcastSponsorPriceIdForTier,
  safeAppReturnPath,
} from "@/lib/billing/stripeConfig";

export async function POST(request) {
  if (!podcastSponsorCheckoutConfigured()) {
    return Response.json({ error: "podcast_billing_not_configured" }, { status: 503 });
  }

  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ error: "unauthorized", message: "Sign in to pay for a podcast sponsorship." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const podcastTierId = String(body.podcastTierId || "").trim();
  const priceId = podcastSponsorPriceIdForTier(podcastTierId);
  if (!priceId) {
    return Response.json({ error: "invalid_podcast_tier", tier: podcastTierId }, { status: 400 });
  }

  const base = appBaseUrl();
  const safeReturn = safeAppReturnPath(body.returnPath, "/podcasts");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const metadata = {
    checkout_kind: "podcast_sponsor",
    podcast_tier_id: podcastTierId,
    workos_user_id: auth.user.id,
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: auth.user.id,
      customer_email: auth.user.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${safeReturn}?sponsor_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${safeReturn}?sponsor_checkout=cancel`,
      metadata,
    });

    if (session.url) {
      return Response.json({ url: session.url });
    }
    return Response.json({ error: "no_checkout_url" }, { status: 500 });
  } catch (e) {
    console.error("[torp] podcast sponsor checkout", e);
    return Response.json({ error: "stripe_error", message: e.message }, { status: 500 });
  }
}
