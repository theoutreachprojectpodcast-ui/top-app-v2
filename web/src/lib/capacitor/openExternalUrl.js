"use client";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { validateExternalBrowserUrl } from "@/lib/security/externalUrlPolicy";

/**
 * Navigate to a URL. On native, stay in the main Capacitor WebView (never Safari / SFSafariViewController).
 * Host must be listed in `capacitor.config.js` → `server.allowNavigation`.
 *
 * @param {string} url
 * @returns {Promise<{ mode: "same-window" | "browser-tab" | "native-browser" }>}
 */
export async function openExternalUrl(url) {
  const check = validateExternalBrowserUrl(url);
  if (!check.ok) {
    throw new Error(`openExternalUrl: blocked (${check.reason})`);
  }
  const target = check.url.href;

  if (Capacitor.isNativePlatform() && typeof window !== "undefined") {
    window.location.assign(target);
    return { mode: "same-window" };
  }

  if (typeof window !== "undefined") {
    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (opened) return { mode: "browser-tab" };
    window.location.assign(target);
    return { mode: "same-window" };
  }

  return { mode: "same-window" };
}

/** @returns {Promise<void>} */
export async function closeExternalBrowserIfOpen() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Browser.close();
  } catch {
    /* not open */
  }
}
