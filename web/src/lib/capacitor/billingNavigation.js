"use client";

import { MOBILE_SHELL_MQ } from "@/hooks/useMobileShell";
import { openExternalBrowserSheet } from "@/lib/capacitor/openExternalBrowserSheet";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";

function isMobileWebShell() {
  if (typeof window === "undefined") return false;
  if (isCapacitorNative()) return false;
  return window.matchMedia(MOBILE_SHELL_MQ).matches;
}

/**
 * Stripe Customer Portal — open in a dismissible browser sheet on native/mobile web
 * so the app shell (header, tab bar) stays on the billing screen underneath.
 *
 * @param {string} stripePortalUrl
 * @param {{ onReturned?: () => void }} [options]
 */
export async function navigateToStripePortal(stripePortalUrl, options = {}) {
  const url = String(stripePortalUrl || "").trim();
  if (!url) return { mode: "missing-url" };

  const onReturned = typeof options.onReturned === "function" ? options.onReturned : null;

  if (typeof window !== "undefined" && (isCapacitorNative() || isMobileWebShell())) {
    return openExternalBrowserSheet(url, {
      title: "Manage billing",
      doneLabel: "Back",
      presentationStyle: "fullscreen",
      onClose: onReturned || undefined,
    });
  }

  if (typeof window !== "undefined") {
    window.location.assign(url);
    return { mode: "same-window" };
  }
  return openExternalUrl(url);
}

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
