/**
 * Stripe configuration — env vars only, no hardcoded keys or price IDs.
 *
 * User memberships: Support Membership ($0.99/yr) + Pro ($5.99/yr).
 * Legacy STRIPE_PRICE_ACCESS_YEARLY is for existing subscribers only — never used for new Support checkout.
 */

export function stripeSecretConfigured() {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export function stripePublishableConfigured() {
  return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
}

/** Support tier yearly price — STRIPE_PRICE_SUPPORT_YEARLY / ANNUAL only (no legacy or monthly fallback). */
export function supportSubscriptionPriceId() {
  return (
    process.env.STRIPE_PRICE_SUPPORT_YEARLY?.trim() ||
    process.env.STRIPE_PRICE_SUPPORT_ANNUAL?.trim() ||
    ""
  );
}

/** Pro tier yearly price — prefer STRIPE_PRICE_PRO_YEARLY. */
export function proSubscriptionPriceId() {
  return (
    process.env.STRIPE_PRICE_PRO_YEARLY?.trim() ||
    process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_MEMBER_MONTHLY?.trim() ||
    ""
  );
}

/** @deprecated Use supportSubscriptionPriceId — legacy App Access yearly checkout. */
export function stripeAccessYearlyConfigured() {
  return stripeSecretConfigured() && !!process.env.STRIPE_PRICE_ACCESS_YEARLY?.trim();
}

/** @returns {string[]} */
export function stripeAccessYearlyMissingEnvKeys() {
  const missing = [];
  if (!stripeSecretConfigured()) missing.push("STRIPE_SECRET_KEY");
  if (!supportSubscriptionPriceId()) {
    missing.push("STRIPE_PRICE_SUPPORT_YEARLY (or STRIPE_PRICE_SUPPORT_ANNUAL)");
  }
  return missing;
}

/** True when Support + Pro recurring checkouts can be created. */
export function stripeMemberRecurringConfigured() {
  return stripeSecretConfigured() && !!supportSubscriptionPriceId() && !!proSubscriptionPriceId();
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
  if (!supportSubscriptionPriceId()) {
    missing.push("STRIPE_PRICE_SUPPORT_YEARLY (or STRIPE_PRICE_SUPPORT_ANNUAL)");
  }
  if (!proSubscriptionPriceId()) {
    missing.push("STRIPE_PRICE_PRO_YEARLY (or STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_MEMBER_MONTHLY)");
  }
  return missing;
}

/**
 * Webhook signing secret for the active deployment.
 * Vercel: Preview/QA → `STRIPE_WEBHOOK_TEST_SECRET`; Production → `STRIPE_WEBHOOK_LIVE_SECRET`.
 * Legacy `STRIPE_WEBHOOK_SECRET` is still accepted.
 */
export function stripeWebhookSecret() {
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  const legacy = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const test = process.env.STRIPE_WEBHOOK_TEST_SECRET?.trim() || "";
  const live = process.env.STRIPE_WEBHOOK_LIVE_SECRET?.trim() || "";
  if (vercelEnv === "production") return live || legacy;
  if (vercelEnv === "preview" || vercelEnv === "development") return test || legacy;
  return legacy || test || live;
}

/** True when webhooks can be verified and processed. */
export function stripeWebhookConfigured() {
  return stripeSecretConfigured() && !!stripeWebhookSecret();
}

export function priceIdForTier(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "access") return supportSubscriptionPriceId();
  if (t === "support") return supportSubscriptionPriceId();
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
 * Same-origin path only for Stripe success/cancel URLs (blocks open redirects like `//evil.com`).
 * @param {string} raw
 * @param {string} [fallback]
 */
export function safeAppReturnPath(raw, fallback = "/profile") {
  const p = String(raw || "").trim();
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  return p;
}

/**
 * Canonical app origin for redirects. Prefer APP_BASE_URL, then NEXT_PUBLIC_APP_URL.
 * For Stripe return URLs, prefer {@link requestOriginForStripeRedirects} so the active dev port
 * matches checkout success/cancel without editing env.
 */
export function appBaseUrl() {
  const raw = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return String(raw).replace(/\/$/, "");
}

/**
 * Origin for Stripe success/cancel URLs from the incoming API request (Host / X-Forwarded-*).
 * Falls back to {@link appBaseUrl} when headers are missing.
 * @param {Request} [request]
 */
export function requestOriginForStripeRedirects(request) {
  if (!request || typeof request.headers?.get !== "function") return appBaseUrl();
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ? forwardedHost.split(",")[0] : request.headers.get("host"))?.trim();
  if (!host) return appBaseUrl();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protoRaw = forwardedProto ? forwardedProto.split(",")[0].trim() : "";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const proto = protoRaw || (local ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

/**
 * Return URL after Stripe Customer Portal. Falls back to /profile under request origin or app base.
 * @param {Request} [request]
 */
export function stripePortalReturnUrl(request) {
  const explicit = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = request ? requestOriginForStripeRedirects(request) : appBaseUrl();
  return `${base}/profile`;
}
