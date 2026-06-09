"use client";

import { requiresExternalWebAccountFlow, openWebBilling, openWebMembership } from "@/lib/capacitor/webAccountRedirects";
import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";

/**
 * Stripe Checkout must never load inside the Capacitor WebView.
 * @param {string} stripeCheckoutUrl
 * @param {{ tier?: string }} [options]
 */
export async function navigateToStripeCheckout(stripeCheckoutUrl, options = {}) {
  if (requiresExternalWebAccountFlow()) {
    return openWebMembership({ tier: options.tier });
  }
  if (stripeCheckoutUrl) {
    window.location.assign(stripeCheckoutUrl);
    return { mode: "same-window" };
  }
  return openWebMembership({ tier: options.tier });
}

/**
 * @param {string} stripePortalUrl
 */
export async function navigateToStripePortal(stripePortalUrl) {
  if (requiresExternalWebAccountFlow()) {
    return openWebBilling();
  }
  if (stripePortalUrl) {
    window.location.assign(stripePortalUrl);
    return { mode: "same-window" };
  }
  return openWebBilling();
}

/**
 * Payment-method setup URLs from Stripe also stay off the WebView on native.
 * @param {string} stripeSetupUrl
 */
export async function navigateToStripeSetupUrl(stripeSetupUrl) {
  if (requiresExternalWebAccountFlow()) {
    return openWebBilling();
  }
  if (stripeSetupUrl) {
    window.location.assign(stripeSetupUrl);
    return { mode: "same-window" };
  }
  return openWebBilling();
}

/**
 * Generic external navigation helper for third-party billing URLs.
 * @param {string} url
 */
export async function navigateToExternalBillingUrl(url) {
  if (requiresExternalWebAccountFlow()) {
    return openExternalUrl(String(url || "").trim());
  }
  if (url) window.location.assign(url);
}
