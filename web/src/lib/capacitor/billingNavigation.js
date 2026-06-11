"use client";

import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";

/**
 * Navigate to Stripe Checkout (in-app WebView on native; same tab on web).
 * @param {string} stripeCheckoutUrl
 */
export async function navigateToStripeCheckout(stripeCheckoutUrl) {
  const url = String(stripeCheckoutUrl || "").trim();
  if (!url) return { mode: "missing-url" };
  if (typeof window !== "undefined") {
    window.location.assign(url);
    return { mode: "same-window" };
  }
  return openExternalUrl(url);
}

/** @param {string} stripePortalUrl */
export async function navigateToStripePortal(stripePortalUrl) {
  const url = String(stripePortalUrl || "").trim();
  if (!url) return { mode: "missing-url" };
  if (typeof window !== "undefined") {
    window.location.assign(url);
    return { mode: "same-window" };
  }
  return openExternalUrl(url);
}

/** @param {string} stripeSetupUrl */
export async function navigateToStripeSetupUrl(stripeSetupUrl) {
  const url = String(stripeSetupUrl || "").trim();
  if (!url) return { mode: "missing-url" };
  if (typeof window !== "undefined") {
    window.location.assign(url);
    return { mode: "same-window" };
  }
  return openExternalUrl(url);
}

/** @param {string} url */
export async function navigateToExternalBillingUrl(url) {
  const target = String(url || "").trim();
  if (!target) return;
  if (typeof window !== "undefined") {
    window.location.assign(target);
    return;
  }
  return openExternalUrl(target);
}
