"use client";

import { appUrl, nativeProductionAppOrigin } from "@/lib/capacitor/webAppOrigin";
import { isCapacitorNative } from "@/lib/capacitor/platform";
import { clearMobileOAuthHandoffState } from "@/lib/auth/mobileOAuthReturn";

/**
 * @param {string} goPath e.g. `/auth/workos-go?mode=signin&returnTo=…`
 */
function normalizeWorkOSGoPath(goPath) {
  const path = String(goPath || "").trim();
  if (!path.startsWith("/auth/workos-go")) {
    throw new Error("Invalid WorkOS handoff path.");
  }
  const qIdx = path.indexOf("?");
  const params = new URLSearchParams(qIdx >= 0 ? path.slice(qIdx + 1) : "");
  if (!params.has("native")) params.set("native", "1");
  return `/auth/workos-go?${params.toString()}`;
}

/**
 * Native: GET `/auth/workos-go` HTML bridge in the main WebView (PKCE cookies + redirect to WorkOS).
 * OAuth completes on `/callback` in the same WebView — no in-app browser handoff sheet.
 *
 * Web: same `/auth/workos-go` bridge or direct navigation.
 *
 * @param {string} goPath
 */
export async function launchWorkOSAuth(goPath) {
  const go = normalizeWorkOSGoPath(goPath);

  if (!isCapacitorNative()) {
    window.location.assign(appUrl(go));
    return;
  }

  clearMobileOAuthHandoffState();
  window.location.assign(`${nativeProductionAppOrigin()}${go}`);
}
