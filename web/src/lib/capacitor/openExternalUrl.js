"use client";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { validateExternalBrowserUrl } from "@/lib/security/externalUrlPolicy";

/**
 * Open a URL outside the Capacitor WebView (Safari / Chrome Custom Tab).
 * Used for signup, membership checkout, and billing — never for in-app Stripe embed.
 *
 * @param {string} url
 * @returns {Promise<{ mode: "native-browser" | "browser-tab" | "same-window" }>}
 */
export async function openExternalUrl(url) {
  const check = validateExternalBrowserUrl(url);
  if (!check.ok) {
    throw new Error(`openExternalUrl: blocked (${check.reason})`);
  }
  const target = check.url.href;

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: target });
    return { mode: "native-browser" };
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
