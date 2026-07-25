import Stripe from "stripe";
import { verifyGooglePlayExternalCheckoutHandoff } from "@/lib/billing/googlePlayExternalContentLinks.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message, status = 400) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = String(url.searchParams.get("session") || "").trim();
  const expiresAt = String(url.searchParams.get("expires") || "").trim();
  const signature = String(url.searchParams.get("signature") || "").trim();

  let verified = false;
  try {
    verified = verifyGooglePlayExternalCheckoutHandoff({ sessionId, expiresAt, signature });
  } catch (error) {
    console.error("[top] Google Play checkout handoff verification unavailable", error);
    return errorResponse("Secure checkout is temporarily unavailable. Please return to the app and try again.", 503);
  }
  if (!verified) {
    return errorResponse("This secure checkout link is invalid or has expired. Please return to the app and try again.");
  }

  const stripeSecret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!stripeSecret) {
    return errorResponse("Secure checkout is temporarily unavailable. Please return to the app and try again.", 503);
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.google_play_ecl !== "1") {
      return errorResponse("This checkout session is not authorized for Google Play external checkout.", 403);
    }
    if (session.status && session.status !== "open") {
      return errorResponse("This checkout session is no longer open. Please return to the app and start again.", 410);
    }

    const checkoutUrl = String(session.url || "").trim();
    const checkoutUri = checkoutUrl ? new URL(checkoutUrl) : null;
    if (!checkoutUri || checkoutUri.protocol !== "https:" || checkoutUri.hostname !== "checkout.stripe.com") {
      return errorResponse("Secure checkout could not be opened. Please return to the app and try again.", 502);
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: checkoutUrl,
        "Cache-Control": "no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[top] Google Play external checkout handoff", {
      sessionId,
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Secure checkout could not be opened. Please return to the app and try again.", 502);
  }
}
