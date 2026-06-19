/**
 * Canonical environment configuration — single source for URLs, auth, billing, storage, and email.
 * Import from here; do not hardcode production/QA hostnames in routes, components, or scripts.
 */
import {
  PRODUCTION_APEX_HOST,
  PRODUCTION_ORIGIN,
  PRODUCTION_WWW_HOST,
  QA_ORIGIN,
  authCallbackPath,
  authCallbackUrl,
  deploymentProfile,
  mobileWebEntryUrl,
  MOBILE_AUTH_CALLBACK_PATH,
  MOBILE_AUTH_START_PATH,
  MOBILE_POST_LOGIN_PATH,
  productionUrlEnvIssues,
  webBaseUrl,
} from "@/lib/runtime/appUrls";
import {
  podcastSponsorMissingPriceEnvKeys,
  priceIdForTier,
  proSubscriptionPriceId,
  stripeAccessYearlyConfigured,
  stripeAccessYearlyMissingEnvKeys,
  stripeMemberRecurringConfigured,
  stripeMemberRecurringMissingEnvKeys,
  stripePublishableConfigured,
  stripeSecretConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

export {
  PRODUCTION_APEX_HOST,
  PRODUCTION_ORIGIN,
  PRODUCTION_WWW_HOST,
  QA_ORIGIN,
  authCallbackPath,
  authCallbackUrl,
  deploymentProfile,
  mobileWebEntryUrl,
  MOBILE_AUTH_CALLBACK_PATH,
  MOBILE_AUTH_START_PATH,
  MOBILE_POST_LOGIN_PATH,
  webBaseUrl,
};

/** @returns {string} */
export function WEB_BASE_URL() {
  return webBaseUrl();
}

/** Same-origin API base (Next.js app routes). */
export function API_BASE_URL() {
  return webBaseUrl();
}

export function QA_BASE_URL() {
  return QA_ORIGIN;
}

export function PROD_BASE_URL() {
  return PRODUCTION_ORIGIN;
}

export function AUTH_CALLBACK_URL() {
  return authCallbackUrl();
}

/** Capacitor in-app OAuth completion path (HTTPS, not custom scheme). */
export function MOBILE_AUTH_CALLBACK_URL() {
  return `${webBaseUrl()}${MOBILE_AUTH_CALLBACK_PATH}`;
}

/** Custom URL scheme for native shell return (WorkOS redirect URI registration). */
export function IOS_URL_SCHEME() {
  return (
    String(process.env.IOS_URL_SCHEME || "").trim() ||
    "com.theoutreachproject.theoutreachproject"
  );
}

export function DATABASE_URL() {
  return String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DATABASE_URL || "").trim();
}

export function STORAGE_URL() {
  const db = DATABASE_URL();
  if (!db) return "";
  return `${db.replace(/\/$/, "")}/storage/v1`;
}

/** @returns {"test" | "live" | "unknown"} */
export function STRIPE_MODE() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unknown";
}

/** @returns {Record<string, string | null>} Price IDs by tier (no secret values). */
export function STRIPE_PRICE_IDS() {
  return {
    accessYearly: process.env.STRIPE_PRICE_ACCESS_YEARLY?.trim() || null,
    supportMonthly: process.env.STRIPE_PRICE_SUPPORT_MONTHLY?.trim() || null,
    proMonthly: proSubscriptionPriceId() || null,
    sponsorMonthly: process.env.STRIPE_PRICE_SPONSOR_MONTHLY?.trim() || null,
    member: priceIdForTier("member") || null,
  };
}

export function EMAIL_PROVIDER_CONFIG() {
  return {
    provider: String(process.env.ADMIN_EMAIL_PROVIDER || "resend").trim() || "resend",
    configured: Boolean(process.env.RESEND_API_KEY?.trim()),
    from: String(process.env.ADMIN_EMAIL_FROM || "").trim() || null,
    notifyRecipients: String(process.env.APPLICATION_NOTIFY_RECIPIENTS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/** Origins allowed for CORS / external browser opens. */
export function ALLOWED_ORIGINS() {
  const extra = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    PRODUCTION_ORIGIN,
    `https://${PRODUCTION_WWW_HOST}`,
    QA_ORIGIN,
    `https://admin.${PRODUCTION_APEX_HOST}`,
    `https://admin-qa.${PRODUCTION_APEX_HOST}`,
    ...extra,
  ];
}

/** WorkOS redirect URIs that must be registered in the dashboard. */
export function ALLOWED_REDIRECTS() {
  const redirects = [
    AUTH_CALLBACK_URL(),
    MOBILE_AUTH_CALLBACK_URL(),
    `${webBaseUrl()}${MOBILE_POST_LOGIN_PATH}`,
  ];
  const mobileScheme = String(process.env.WORKOS_MOBILE_REDIRECT_URI || "").trim();
  if (mobileScheme) redirects.push(mobileScheme);
  return [...new Set(redirects.filter(Boolean))];
}

/** Safe env issues for health endpoints (no secret values). */
export function environmentValidationIssues() {
  const issues = [...productionUrlEnvIssues()];
  const profile = deploymentProfile();

  if (profile === "production") {
    const appUrl = WEB_BASE_URL().toLowerCase();
    if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
      issues.push("WEB_BASE_URL points at localhost in production profile");
    }
    if (appUrl.includes("vercel.app") && !appUrl.includes("theoutreachproject.app")) {
      issues.push("WEB_BASE_URL uses preview hostname in production profile");
    }
    if (appUrl.includes("qa.")) {
      issues.push("WEB_BASE_URL uses QA hostname in production profile");
    }
    if (STRIPE_MODE() !== "live") {
      issues.push("STRIPE_MODE is not live in production profile");
    }
    const workosKey = String(process.env.WORKOS_API_KEY || "");
    if (workosKey.startsWith("sk_test_")) {
      issues.push("WORKOS_API_KEY is staging (sk_test_) in production profile");
    }
  }

  if (profile === "qa") {
    if (STRIPE_MODE() === "live") {
      issues.push("STRIPE_MODE is live in QA profile — use test keys");
    }
    if (!DATABASE_URL()) {
      issues.push("QA Supabase URL unset");
    }
  }

  if (!stripeSecretConfigured()) {
    issues.push("STRIPE_SECRET_KEY unset");
  } else if (profile !== "local" && !stripeWebhookConfigured()) {
    issues.push("Stripe webhook secret unset for deployment profile");
  }

  return issues;
}

/** @returns {boolean} */
export function isEnvironmentValidForProfile(profile = deploymentProfile()) {
  const issues = environmentValidationIssues();
  if (profile === "local") {
    return issues.filter((i) => !i.includes("localhost")).length === 0 || issues.length <= 2;
  }
  return issues.length === 0;
}

export function buildStripeHealthSummary() {
  const mode = STRIPE_MODE();
  const missing = [
    ...stripeAccessYearlyMissingEnvKeys(),
    ...stripeMemberRecurringMissingEnvKeys(),
    ...podcastSponsorMissingPriceEnvKeys(),
  ];
  const uniqueMissing = [...new Set(missing)];
  return {
    ok:
      stripeSecretConfigured() &&
      stripePublishableConfigured() &&
      stripeWebhookConfigured() &&
      (deploymentProfile() !== "production" || mode === "live"),
    mode,
    webhookConfigured: stripeWebhookConfigured(),
    accessYearly: stripeAccessYearlyConfigured(),
    memberRecurring: stripeMemberRecurringConfigured(),
    priceIds: STRIPE_PRICE_IDS(),
    missingEnvKeys: uniqueMissing,
  };
}
