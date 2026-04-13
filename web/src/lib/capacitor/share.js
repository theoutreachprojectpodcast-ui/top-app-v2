"use client";

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

/**
 * Share title/text/url — native Share sheet on Capacitor; Web Share API in supported browsers; no-op otherwise.
 * @param {{ title?: string, text?: string, url?: string, dialogTitle?: string }} opts
 */
export async function shareContent(opts = {}) {
  if (typeof window === "undefined") {
    return { ok: false, via: "ssr" };
  }

  const title = String(opts.title || "").trim();
  const text = String(opts.text || "").trim();
  const url = String(opts.url || "").trim();

  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: title || undefined,
      text: text || undefined,
      url: url || undefined,
      dialogTitle: opts.dialogTitle || title || "Share",
    });
    return { ok: true, via: "capacitor" };
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: title || undefined, text: text || undefined, url: url || undefined });
      return { ok: true, via: "web-share" };
    } catch (e) {
      if (e && e.name === "AbortError") return { ok: false, via: "aborted" };
      return { ok: false, via: "web-share-error", message: String(e?.message || e) };
    }
  }

  return { ok: false, via: "unavailable" };
}
