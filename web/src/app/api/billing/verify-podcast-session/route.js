import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { podcastSponsorCheckoutConfigured } from "@/lib/billing/stripeConfig";

export async function GET(request) {
  if (!podcastSponsorCheckoutConfigured()) {
    return Response.json({ paid: false, error: "podcast_billing_not_configured" }, { status: 503 });
  }

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return Response.json({ paid: false, error: "missing_session_id" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.checkout_kind !== "podcast_sponsor") {
      return Response.json({ paid: false, error: "wrong_session_kind" }, { status: 400 });
    }
    if (String(session.metadata?.workos_user_id || "") !== user.id) {
      return Response.json({ paid: false, error: "session_user_mismatch" }, { status: 403 });
    }
    const paid = session.payment_status === "paid";
    return Response.json({
      paid,
      podcastTierId: String(session.metadata?.podcast_tier_id || ""),
      paymentStatus: session.payment_status,
    });
  } catch (e) {
    console.error("[torp] verify podcast session", e);
    return Response.json({ paid: false, error: "stripe_error", message: e.message }, { status: 500 });
  }
}
