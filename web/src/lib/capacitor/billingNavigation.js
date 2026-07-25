"use client";

import { MOBILE_SHELL_MQ } from "@/hooks/useMobileShell";
import { openExternalBrowserSheet } from "@/lib/capacitor/openExternalBrowserSheet";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";
import {
  launchGooglePlayExternalContentLink,
  requiresGooglePlayExternalContentLink,
} from "@/lib/capacitor/googlePlayExternalContentLinks";

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
 * Navigate to Stripe Checkout.
 *
 * Android production builds must use Google Play's External Content Links API. Google Play shows
 * the required information screen and opens a short-lived TOP-owned handoff URL in the external
 * browser; that endpoint then redirects to the server-created Stripe Checkout Session.
 *
 * @param {string} stripeCheckoutUrl
 * @param {{ googlePlayExternalLinkUrl?: string, externalTransactionToken?: string }} [options]
 */
export async function navigateToStripeCheckout(stripeCheckoutUrl, options = {}) {
  const url = String(stripeCheckoutUrl || "").trim();
  if (!url) return { mode: "missing-url" };

  if (requiresGooglePlayExternalContentLink()) {
    const googlePlayExternalLinkUrl = String(options.googlePlayExternalLinkUrl || "").trim();
    const externalTransactionToken = String(options.externalTransactionToken || "").trim();
    if (!googlePlayExternalLinkUrl || !externalTransactionToken) {
      const error = new Error("Google Play did not provide a complete external checkout handoff. Please try again.");
      error.code = "GOOGLE_PLAY_ECL_INCOMPLETE_HANDOFF";
      throw error;
    }
    await launchGooglePlayExternalContentLink({
      url: googlePlayExternalLinkUrl,
      externalTransactionToken,
    });
    return { mode: "google-play-external-content-link" };
  }

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
