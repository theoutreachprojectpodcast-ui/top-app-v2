"use client";

import { appUrl } from "@/lib/capacitor/webAppOrigin";

/**
 * WorkOS AuthKit sign-in — same WebView navigation on web and native Capacitor.
 * OAuth completes on `/callback` inside the app shell (no Capacitor Browser sheet).
 *
 * @param {string} goPath e.g. `/auth/workos-go?mode=signin&returnTo=…`
 */
export async function launchWorkOSAuth(goPath) {
  const path = String(goPath || "").trim();
  if (!path.startsWith("/auth/workos-go")) {
    throw new Error("Invalid WorkOS handoff path.");
  }
  window.location.assign(appUrl(path));
}
