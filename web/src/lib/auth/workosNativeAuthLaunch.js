"use client";

import { Browser } from "@capacitor/browser";
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

  const jsonUrl = path.includes("?") ? `${path}&format=json` : `${path}?format=json`;
  const res = await fetch(jsonUrl, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) {
    const msg = String(data?.message || "").trim();
    throw new Error(msg || "Could not start secure sign in.");
  }

  const stateKey = String(data.stateKey || "").trim();
  if (stateKey && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(TORP_OAUTH_STATE_KEY, stateKey);
    sessionStorage.setItem(TORP_OAUTH_BROWSER_PENDING, "1");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const browserStart = `${origin}/auth/workos-browser-start?go=${encodeURIComponent(String(data.url))}`;

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
