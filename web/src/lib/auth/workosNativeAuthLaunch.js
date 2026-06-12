"use client";

import { Browser } from "@capacitor/browser";
import { appUrl } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { TORP_OAUTH_BROWSER_PENDING, TORP_OAUTH_STATE_KEY } from "@/lib/auth/oauthMobileHandoff";

/**
 * WorkOS AuthKit uses Cloudflare Turnstile ("verify you are human"), which often fails in WKWebView.
 * On native, mint PKCE in the main WebView then open WorkOS in Capacitor's in-app browser sheet
 * (SFSafariViewController — still inside the app, not the Safari app).
 *
 * @param {string} goPath e.g. `/auth/workos-go?mode=signin&returnTo=…`
 */
export async function launchNativeWorkOSAuth(goPath) {
  const path = String(goPath || "").trim();
  if (!path.startsWith("/auth/workos-go")) {
    throw new Error("Invalid WorkOS handoff path.");
  }

  const jsonPath = path.includes("?") ? `${path}&format=json&native=1` : `${path}?format=json&native=1`;
  const jsonUrl = appUrl(jsonPath);
  let res;
  try {
    res = await fetch(jsonUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Could not reach the sign-in service. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  const stateKey = String(data?.key || data?.stateKey || "").trim();
  const authorizeUrl = String(data?.url || "").trim();

  if (!res.ok || (!stateKey && !authorizeUrl)) {
    const msg = String(data?.message || "").trim();
    if (res.status === 503 || /not defined|referenceerror/i.test(msg)) {
      throw new Error("Sign-in is temporarily unavailable. Try again in a moment or contact support.");
    }
    throw new Error(msg || "Could not start secure sign in.");
  }

  if (stateKey && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(TORP_OAUTH_STATE_KEY, stateKey);
    sessionStorage.setItem(TORP_OAUTH_BROWSER_PENDING, "1");
  }

  let browserStart;
  if (stateKey) {
    browserStart = appUrl(`/auth/workos-browser-start?key=${encodeURIComponent(stateKey)}`);
  } else {
    const browserParams = new URLSearchParams();
    browserParams.set("go", authorizeUrl);
    const sealedState = String(data.sealedState || "").trim();
    if (sealedState) browserParams.set("s", sealedState);
    browserStart = appUrl(`/auth/workos-browser-start?${browserParams.toString()}`);
  }

  await Browser.open({
    url: browserStart,
    presentationStyle: "fullscreen",
    toolbarColor: "#101814",
  });
}

/**
 * @param {string} goPath
 */
export async function launchWorkOSAuth(goPath) {
  if (isCapacitorNative()) {
    await launchNativeWorkOSAuth(goPath);
    return;
  }
  window.location.assign(goPath);
}
