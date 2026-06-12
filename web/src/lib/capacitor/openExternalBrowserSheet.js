"use client";

import { Browser } from "@capacitor/browser";
import { isCapacitorNative } from "@/lib/capacitor/platform";

/**
 * @param {string} rawUrl
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
function validateBrowserSheetUrl(rawUrl) {
  const target = String(rawUrl || "").trim();
  if (!target) return { ok: false, reason: "missing_url" };

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "unsupported_protocol" };
  }

  if (parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    return { ok: false, reason: "http_not_allowed" };
  }

  return { ok: true, url: parsed };
}

/**
 * Open a third-party URL in a dismissible browser sheet on native (Done returns to the app).
 * On web, opens a new tab when allowed.
 *
 * @param {string} url
 * @returns {Promise<{ mode: "browser-sheet" | "browser-tab" | "same-window" }>}
 */
export async function openExternalBrowserSheet(url) {
  const check = validateBrowserSheetUrl(url);
  if (!check.ok) {
    throw new Error(`openExternalBrowserSheet: blocked (${check.reason})`);
  }
  const target = check.url.href;

  if (isCapacitorNative()) {
    await Browser.open({
      url: target,
      presentationStyle: "fullscreen",
      toolbarColor: "#101814",
    });
    return { mode: "browser-sheet" };
  }

  if (typeof window !== "undefined") {
    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (opened) return { mode: "browser-tab" };
    window.location.assign(target);
    return { mode: "same-window" };
  }

  return { mode: "same-window" };
}
