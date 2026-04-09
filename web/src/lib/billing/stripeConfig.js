/**
 * Stripe configuration — env vars only, no hardcoded keys or price IDs.
 * Server routes should import from here; never expose STRIPE_SECRET_KEY to the client.
 */

export function stripeSecretConfigured() {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export function stripePublishableConfigured() {
  return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
}

/** True when Checkout can be created (secret key + all paid tier price IDs). */
export function stripeCheckoutConfigured() {
  return (
    stripeSecretConfigured() &&
    !!process.env.STRIPE_PRICE_SUPPORT_MONTHLY?.trim() &&
    !!process.env.STRIPE_PRICE_MEMBER_MONTHLY?.trim() &&
    !!process.env.STRIPE_PRICE_SPONSOR_MONTHLY?.trim()
  );
}

/** True when webhooks can be verified and processed. */
export function stripeWebhookConfigured() {
  return stripeSecretConfigured() && !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

export function priceIdForTier(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "support") return process.env.STRIPE_PRICE_SUPPORT_MONTHLY?.trim() || "";
  if (t === "member") return process.env.STRIPE_PRICE_MEMBER_MONTHLY?.trim() || "";
  if (t === "sponsor") return process.env.STRIPE_PRICE_SPONSOR_MONTHLY?.trim() || "";
  return "";
}

/**
 * Canonical app origin for redirects. Prefer APP_BASE_URL, then NEXT_PUBLIC_APP_URL.
 */
export function appBaseUrl() {
  const raw = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return String(raw).replace(/\/$/, "");
}

/**
 * Return URL after Stripe Customer Portal. Falls back to /profile under app base.
 */
export function stripePortalReturnUrl() {
  const explicit = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${appBaseUrl()}/profile`;
}
