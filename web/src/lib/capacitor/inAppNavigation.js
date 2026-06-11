"use client";

import { isCapacitorNative } from "@/lib/capacitor/platform";

let installed = false;

/**
 * Keep http(s) navigation in the Capacitor WKWebView — never Safari / Chrome Custom Tabs.
 * Requires matching hosts in `capacitor.config.js` → `server.allowNavigation`.
 */
export function installCapacitorInAppNavigation() {
  if (typeof window === "undefined" || !isCapacitorNative() || installed) return;
  installed = true;

  const nativeOpen = window.open.bind(window);
  window.open = (url, target, features) => {
    const raw = String(url || "").trim();
    if (raw && (!target || target === "_blank")) {
      if (/^https?:\/\//i.test(raw)) {
        window.location.assign(raw);
        return null;
      }
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
        window.location.assign(anchor.href);
      }
    },
    true,
  );
}
