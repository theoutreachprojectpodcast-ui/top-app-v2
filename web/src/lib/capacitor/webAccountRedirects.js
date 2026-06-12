"use client";

import { launchWorkOSAuth } from "@/lib/auth/workosNativeAuthLaunch";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { absoluteWebAppUrl, MOBILE_APP_DEEP_LINK, webAppPathWithMobileReturn } from "@/lib/capacitor/webAppOrigin";
import { openExternalUrl } from "@/lib/capacitor/openExternalUrl";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * Account signup, membership checkout, and billing run in the Capacitor WebView
 * (same as the website). Stripe Checkout is allowed via `allowNavigation` in capacitor.config.js.
 */
export function requiresExternalWebAccountFlow() {
  return false;
}

/**
 * @param {string} path
 * @param {Record<string, string | undefined>} [params]
 */
function encodeReturnTo(path, params) {
  return encodeURIComponent(webAppPathWithMobileReturn(path, params));
}

/** @deprecated Prefer in-app `/sign-up` routes. Kept for optional external flows. */
export async function openWebSignup(options = {}) {
  const returnPath = options.returnPath || "/membership/success";
  const url = `${absoluteWebAppUrl("/signup").split("?")[0]}?returnTo=${encodeReturnTo(returnPath, options.params)}`;
  return openExternalUrl(url);
}

/** @deprecated Prefer in-app `/login` routes. */
export async function openWebLogin(options = {}) {
  const returnPath = options.returnPath || "/profile";
  const url = `${absoluteWebAppUrl("/login").split("?")[0]}?returnTo=${encodeReturnTo(returnPath, options.params)}`;
  return openExternalUrl(url);
}

/** Native Capacitor WorkOS sign-in inside the main WebView (same path as web). */
export async function openNativeWorkOSSignIn(options = {}) {
  if (!isCapacitorNative()) {
    return { ok: false, reason: "not-native" };
  }
  const goPath = workosGoUrl({
    mode: "signin",
    returnTo: options.returnPath || "/",
    rememberDevice: options.rememberDevice,
    loginHint: options.loginHint,
    native: true,
  });
  await launchWorkOSAuth(goPath);
  return { ok: true };
}

/** @deprecated Prefer in-app `/membership`. */
export async function openWebMembership(options = {}) {
  const params = { ...(options.params || {}) };
  if (options.tier) params.tier = String(options.tier);
  const url = absoluteWebAppUrl("/membership", params);
  return openExternalUrl(url);
}

/** @deprecated Prefer in-app `/billing`. */
export async function openWebBilling(options = {}) {
  const url = absoluteWebAppUrl("/billing", options.params || {});
  return openExternalUrl(url);
}

/** @deprecated Prefer in-app `/sponsor`. */
export async function openWebSponsorMembership(options = {}) {
  const url = absoluteWebAppUrl("/sponsor", options.params || {});
  return openExternalUrl(url);
}

/** @deprecated Prefer in-app `/profile`. */
export async function openWebProfile(options = {}) {
  const url = absoluteWebAppUrl("/profile", options.params || {});
  return openExternalUrl(url);
}

/** Attempt to reopen the installed native app after an external flow. */
export async function openMobileAppDeepLink() {
  const { isCapacitorNative } = await import("@/lib/capacitor/platform");
  if (!isCapacitorNative()) return { ok: false, reason: "not-native" };
  try {
    await openExternalUrl(MOBILE_APP_DEEP_LINK);
    return { ok: true };
  } catch {
    return { ok: false, reason: "deep-link-failed" };
  }
}
