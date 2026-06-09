"use client";

import { absoluteWebAppUrl, MOBILE_APP_DEEP_LINK, webAppPathWithMobileReturn } from "@/lib/capacitor/webAppOrigin";
import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Mobile native apps must not collect payment or run Stripe inside the WebView.
 * Sign-in stays in the WebView so WorkOS session cookies remain on the app origin.
 */
export function requiresExternalWebAccountFlow() {
  return isCapacitorNative();
}

/**
 * @param {string} path
 * @param {Record<string, string | undefined>} [params]
 */
function encodeReturnTo(path, params) {
  return encodeURIComponent(webAppPathWithMobileReturn(path, params));
}

/** Open web signup (WorkOS AuthKit) in the system browser. */
export async function openWebSignup(options = {}) {
  const returnPath = options.returnPath || "/membership/success";
  const url = `${absoluteWebAppUrl("/signup").split("?")[0]}?returnTo=${encodeReturnTo(returnPath, options.params)}`;
  return openExternalUrl(url);
}

/** Open web login in the system browser (optional; primary sign-in remains in-app). */
export async function openWebLogin(options = {}) {
  const returnPath = options.returnPath || "/profile";
  const url = `${absoluteWebAppUrl("/login").split("?")[0]}?returnTo=${encodeReturnTo(returnPath, options.params)}`;
  return openExternalUrl(url);
}

/** Open membership hub / upgrades on the website (Stripe checkout runs in browser). */
export async function openWebMembership(options = {}) {
  const params = { ...(options.params || {}) };
  if (options.tier) params.tier = String(options.tier);
  const url = absoluteWebAppUrl("/membership", params);
  return openExternalUrl(url);
}

/** Open billing portal setup on the website. */
export async function openWebBilling(options = {}) {
  const url = absoluteWebAppUrl("/billing", options.params || {});
  return openExternalUrl(url);
}

/** Open sponsor membership packages on the website. */
export async function openWebSponsorMembership(options = {}) {
  const url = absoluteWebAppUrl("/sponsor", options.params || {});
  return openExternalUrl(url);
}

/** Open profile on the website (account management). */
export async function openWebProfile(options = {}) {
  const url = absoluteWebAppUrl("/profile", options.params || {});
  return openExternalUrl(url);
}

/** Attempt to reopen the installed native app after a web flow. */
export async function openMobileAppDeepLink() {
  if (!isCapacitorNative()) return { ok: false, reason: "not-native" };
  try {
    await openExternalUrl(MOBILE_APP_DEEP_LINK);
    return { ok: true };
  } catch {
    return { ok: false, reason: "deep-link-failed" };
  }
}
