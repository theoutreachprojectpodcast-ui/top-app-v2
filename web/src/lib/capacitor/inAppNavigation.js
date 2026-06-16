"use client";

import { isCapacitorNative } from "@/lib/capacitor/platform";
import { openExternalBrowserSheet } from "@/lib/capacitor/openExternalBrowserSheet";

let installed = false;

/**
 * Keep same-origin navigation in the Capacitor WKWebView.
 * External https links open in the in-app browser sheet — never `location.assign` the main WebView.
 */
export function installCapacitorInAppNavigation() {
  if (typeof window === "undefined" || !isCapacitorNative() || installed) return;
  installed = true;

  const nativeOpen = window.open.bind(window);
  window.open = (url, target, features) => {
    const raw = String(url || "").trim();
    if (raw && (!target || target === "_blank") && /^https?:\/\//i.test(raw)) {
      void openExternalBrowserSheet(raw).catch(() => {
        nativeOpen(url, target, features);
      });
      return null;
    }
    return nativeOpen(url, target, features);
  };

  document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || anchor.target !== "_blank") return;
      const href = String(anchor.getAttribute("href") || "").trim();
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (/^https?:\/\//i.test(href)) {
        event.preventDefault();
        const label = String(anchor.getAttribute("aria-label") || anchor.textContent || "").trim();
        void openExternalBrowserSheet(anchor.href, { title: label || undefined }).catch(() => {
          window.location.assign(anchor.href);
        });
      }
    },
    true,
  );
}
