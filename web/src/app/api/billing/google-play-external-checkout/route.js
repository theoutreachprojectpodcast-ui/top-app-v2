import Stripe from "stripe";
import { verifyGooglePlayExternalCheckoutHandoff } from "@/lib/billing/googlePlayExternalContentLinks.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function commonHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function errorResponse(message, status = 400) {
  return new Response(message, {
    status,
    headers: commonHeaders("text/plain; charset=utf-8"),
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAmount(amount, currency) {
  if (!Number.isSafeInteger(amount)) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "usd").toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function checkoutLandingHtml({ checkoutUrl, offerName, amountLabel, cadenceLabel }) {
  const safeCheckoutUrl = escapeHtml(checkoutUrl);
  const safeOfferName = escapeHtml(offerName);
  const safeAmountLabel = escapeHtml(amountLabel);
  const safeCadenceLabel = escapeHtml(cadenceLabel);
  const price = safeAmountLabel
    ? `${safeAmountLabel}${safeCadenceLabel ? ` ${safeCadenceLabel}` : ""}`
    : "Price shown securely by Stripe";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Continue to secure checkout | The Outreach Project</title>
  <style>
    :root { color-scheme: dark; font-family: Arial, Helvetica, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0c0d0c; color: #f4f5f4; padding: 24px; }
    main { width: min(100%, 560px); background: #151815; border: 1px solid #2b342b; border-radius: 20px; padding: 28px; box-shadow: 0 18px 60px rgba(0,0,0,.35); }
    .brand { margin: 0 0 22px; color: #66d56d; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    h1 { margin: 0 0 10px; font-size: clamp(1.65rem, 5vw, 2.15rem); }
    .offer { margin: 20px 0; padding: 18px; border-radius: 14px; background: #0f120f; border: 1px solid #263026; }
    .offer strong, .offer span { display: block; }
    .offer span { margin-top: 6px; color: #c8cec8; }
    p { color: #c8cec8; line-height: 1.55; }
    .button { display: block; width: 100%; margin-top: 24px; padding: 15px 18px; border-radius: 12px; background: #2daf38; color: #071008; text-align: center; text-decoration: none; font-weight: 800; }
    .back { display: block; margin-top: 16px; color: #b8c1b8; text-align: center; }
    .fine { margin-top: 18px; font-size: .88rem; color: #929b92; }
  </style>
</head>
<body>
  <main>
    <p class="brand">The Outreach Project</p>
    <h1>Continue to secure checkout</h1>
    <p>You are leaving Google Play to complete this purchase on The Outreach Project's website.</p>
    <section class="offer" aria-label="Offer details">
      <strong>${safeOfferName}</strong>
      <span>${price}</span>
    </section>
    <p>Stripe securely processes the payment. The Outreach Project provides purchase support, refunds, and a process to dispute unauthorized transactions.</p>
    <a class="button" href="${safeCheckoutUrl}" rel="noreferrer">Continue to Stripe checkout</a>
    <a class="back" href="https://theoutreachproject.app/membership" rel="noreferrer">Return to membership</a>
    <p class="fine">This checkout link expires shortly. If it expires, return to the app and start checkout again.</p>
  </main>
</body>
</html>`;
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });
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

    const lineItem = session.line_items?.data?.[0] || null;
    const product = lineItem?.price?.product;
    const productName =
      product && typeof product === "object" && !product.deleted
        ? String(product.name || "").trim()
        : "";
    const offerName =
      productName ||
      String(lineItem?.description || "").trim() ||
      (session.metadata?.membership_tier === "member"
        ? "The Outreach Project Pro Membership"
        : "The Outreach Project purchase");
    const amount = Number.isSafeInteger(session.amount_total)
      ? session.amount_total
      : Number.isSafeInteger(lineItem?.amount_total)
        ? lineItem.amount_total
        : null;
    const amountLabel = formatAmount(amount, session.currency || lineItem?.currency);
    const recurringInterval = String(lineItem?.price?.recurring?.interval || "").trim();
    const cadenceLabel = recurringInterval ? `per ${recurringInterval}` : "";

    return new Response(
      checkoutLandingHtml({ checkoutUrl, offerName, amountLabel, cadenceLabel }),
      {
        status: 200,
        headers: commonHeaders("text/html; charset=utf-8"),
      },
    );
  } catch (error) {
    console.error("[top] Google Play external checkout handoff", {
      sessionId,
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Secure checkout could not be opened. Please return to the app and try again.", 502);
  }
}
