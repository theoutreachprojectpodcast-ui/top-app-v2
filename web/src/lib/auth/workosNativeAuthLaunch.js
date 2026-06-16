"use client";

import { Browser } from "@capacitor/browser";
import { appUrl, nativeProductionAppOrigin } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { TORP_OAUTH_BROWSER_PENDING, TORP_OAUTH_STATE_KEY } from "@/lib/auth/oauthMobileHandoff";

/**
 * @param {string} goPath e.g. `/auth/workos-go?mode=signin&returnTo=…`
 */
function buildWorkOSGoJsonPath(goPath) {
  const path = String(goPath || "").trim();
  const qIdx = path.indexOf("?");
  const params = new URLSearchParams(qIdx >= 0 ? path.slice(qIdx + 1) : "");
  params.set("format", "json");
  if (!params.has("native")) params.set("native", "1");
  return `/auth/workos-go?${params.toString()}`;
}

/**
 * Native: mint PKCE server-side, store poll key in WebView, open short `browser-start?key=` URL.
 * Web: navigate to `/auth/workos-go` HTML bridge (AuthKit-compatible PKCE on response).
 *
 * @param {string} goPath
 */
export async function launchWorkOSAuth(goPath) {
  const path = String(goPath || "").trim();
  if (!path.startsWith("/auth/workos-go")) {
    throw new Error("Invalid WorkOS handoff path.");
  }

  if (!isCapacitorNative()) {
    window.location.assign(appUrl(path));
    return;
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(TORP_OAUTH_BROWSER_PENDING, "1");
  }

  const origin = nativeProductionAppOrigin();
  const jsonUrl = `${origin}${buildWorkOSGoJsonPath(path)}`;

  let res;
  try {
    res = await fetch(jsonUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
      sessionStorage.removeItem(TORP_OAUTH_STATE_KEY);
    }
    throw new Error("Could not reach the sign-in service. Check your connection and try again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
      sessionStorage.removeItem(TORP_OAUTH_STATE_KEY);
    }
    const msg = String(data?.message || "").trim();
    throw new Error(msg || "Could not start secure sign in.");
  }

  const stateKey = String(data.stateKey || data.key || "").trim();
  if (!stateKey) {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(TORP_OAUTH_BROWSER_PENDING);
    }
    throw new Error("Could not start secure sign in.");
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(TORP_OAUTH_STATE_KEY, stateKey);
  }

  const browserStart = String(data.browserStart || "").trim();
  const browserUrl = browserStart.startsWith("http")
    ? browserStart
    : browserStart
      ? `${origin}${browserStart.startsWith("/") ? browserStart : `/${browserStart}`}`
      : `${origin}/auth/workos-browser-start?key=${encodeURIComponent(stateKey)}`;

  await Browser.open({
    url: browserUrl,
    presentationStyle: "fullscreen",
    toolbarColor: "#101814",
  });
}
