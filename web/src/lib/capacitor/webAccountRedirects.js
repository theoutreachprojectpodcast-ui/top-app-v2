"use client";

import { absoluteWebAppUrl, MOBILE_APP_DEEP_LINK, webAppPathWithMobileReturn } from "@/lib/capacitor/webAppOrigin";
import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { safeAppReturnPath } from "@/lib/billing/stripeConfig";

/**
 * Mobile native apps must not collect payment or run Stripe inside the WebView.
 * WorkOS sign-in/sign-up open in the system browser and return via deep link + session transfer.
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

/**
 * @param {string} route
 * @param {Record<string, string | undefined>} [options]
 */
function buildMobileWorkOSEntryUrl(route, options = {}) {
  const origin = absoluteWebAppUrl("/").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("mobile", "1");
  const returnPath = safeAppReturnPath(options.returnPath || "/", "/");
  params.set("returnTo", returnPath);
  if (options.rememberDevice === false) params.set("remember", "0");
  const hint = String(options.loginHint || "").trim();
  if (hint) params.set("loginHint", hint);
  return `${origin}${route}?${params.toString()}`;
}

/** Open web signup (WorkOS AuthKit) in the system browser; session returns to the native app. */
export async function openWebSignup(options = {}) {
  const returnPath = options.returnPath || "/membership/success";
  const url = buildMobileWorkOSEntryUrl("/signup", {
    returnPath: webAppPathWithMobileReturn(returnPath, options.params),
    rememberDevice: options.rememberDevice,
    loginHint: options.loginHint,
  });
  return openExternalUrl(url);
}

/** Open WorkOS sign-in in the system browser; session returns to the native app WebView. */
export async function openWebLogin(options = {}) {
  const url = buildMobileWorkOSEntryUrl("/api/auth/workos/signin", {
    returnPath: options.returnPath || "/",
    rememberDevice: options.rememberDevice,
    loginHint: options.loginHint,
  });
  return openExternalUrl(url);
}

/** Convenience wrapper for native WorkOS sign-in from in-app CTAs. */
export async function openNativeWorkOSSignIn(options = {}) {
  if (!requiresExternalWebAccountFlow()) {
    return { ok: false, reason: "not-native" };
  }
  await openWebLogin(options);
  return { ok: true };
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
  if (typeof window === "undefined") return { ok: false, reason: "no-window" };
  window.location.href = MOBILE_APP_DEEP_LINK;
  return { ok: true };
}
