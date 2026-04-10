/**
 * Stripe configuration — env vars only, no hardcoded keys or price IDs.
 * Server routes should import from here; never expose STRIPE_SECRET_KEY to the client.
 *
 * Member recurring: STRIPE_PRICE_SUPPORT_MONTHLY + STRIPE_PRICE_PRO_MONTHLY (preferred)
 *   or legacy STRIPE_PRICE_MEMBER_MONTHLY for Pro.
 * Optional sponsor subscription: STRIPE_PRICE_SPONSOR_MONTHLY (onboarding “Sponsor Membership” tier).
 */

export function stripeSecretConfigured() {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export function stripePublishableConfigured() {
  return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
}

/** Pro / “member” tier recurring price — prefer STRIPE_PRICE_PRO_MONTHLY, else legacy MEMBER. */
export function proSubscriptionPriceId() {
  return (
    process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() || process.env.STRIPE_PRICE_MEMBER_MONTHLY?.trim() || ""
  );
}

/** True when Support + Pro recurring checkouts can be created (does not require sponsor subscription price). */
export function stripeMemberRecurringConfigured() {
  return (
    stripeSecretConfigured() &&
    !!process.env.STRIPE_PRICE_SUPPORT_MONTHLY?.trim() &&
    !!proSubscriptionPriceId()
  );
}

/** True when sponsor *subscription* tier checkout is available (optional). */
export function stripeSponsorSubscriptionConfigured() {
  return stripeSecretConfigured() && !!process.env.STRIPE_PRICE_SPONSOR_MONTHLY?.trim();
}

/**
 * Full membership onboarding (all paid tiers including sponsor subscription).
 * For profile-only Support/Pro, use stripeMemberRecurringConfigured().
 */
export function stripeCheckoutConfigured() {
  return stripeMemberRecurringConfigured() && stripeSponsorSubscriptionConfigured();
}

/** Env keys missing for Support + Pro recurring billing (for UI/docs). */
export function stripeMemberRecurringMissingEnvKeys() {
  const missing = [];
  if (!stripeSecretConfigured()) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_PRICE_SUPPORT_MONTHLY?.trim()) missing.push("STRIPE_PRICE_SUPPORT_MONTHLY");
  if (!proSubscriptionPriceId()) missing.push("STRIPE_PRICE_PRO_MONTHLY or STRIPE_PRICE_MEMBER_MONTHLY");
  return missing;
}

/** True when webhooks can be verified and processed. */
export function stripeWebhookConfigured() {
  return stripeSecretConfigured() && !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

export function priceIdForTier(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "support") return process.env.STRIPE_PRICE_SUPPORT_MONTHLY?.trim() || "";
  if (t === "member") return proSubscriptionPriceId();
  if (t === "sponsor") return process.env.STRIPE_PRICE_SPONSOR_MONTHLY?.trim() || "";
  return "";
}

/** One-time Checkout prices for podcast sponsor tiers (Sponsor the Show). */
const PODCAST_TIER_ENV_KEYS = {
  "podcast-community-500": "STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY",
  "podcast-impact-1000": "STRIPE_PRICE_PODCAST_SPONSOR_IMPACT",
  "podcast-foundational-2500": "STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL",
};

export function podcastSponsorPriceIdForTier(tierId) {
  const key = PODCAST_TIER_ENV_KEYS[String(tierId || "").trim()];
  if (!key) return "";
  return process.env[key]?.trim() || "";
}

export function podcastSponsorCheckoutConfigured() {
  if (!stripeSecretConfigured()) return false;
  return Object.keys(PODCAST_TIER_ENV_KEYS).every((id) => !!podcastSponsorPriceIdForTier(id));
}

/** For docs / admin UI when env is incomplete. */
export function podcastSponsorMissingPriceEnvKeys() {
  return Object.entries(PODCAST_TIER_ENV_KEYS)
    .filter(([id]) => !podcastSponsorPriceIdForTier(id))
    .map(([, envKey]) => envKey);
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
