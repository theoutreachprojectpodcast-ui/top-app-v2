import { workosAuthBrandedHtmlPage } from "@/lib/auth/workosAuthBrand";
import { webBaseUrl } from "@/lib/runtime/appUrls";
import { buildOAuthHandoffCompleteUniversalLink } from "@/lib/capacitor/mobileDeepLinks";

/** Deep link WorkOS uses to return OAuth results into the Capacitor shell (register in WorkOS dashboard). */
export const WORKOS_MOBILE_CALLBACK_SCHEME = "com.theoutreachproject.theoutreachproject://callback";

/** @returns {string} */
export function workosMobileRedirectUri() {
  const fromEnv = String(
    process.env.WORKOS_MOBILE_REDIRECT_URI ||
      process.env.NEXT_PUBLIC_WORKOS_MOBILE_REDIRECT_URI ||
      WORKOS_MOBILE_CALLBACK_SCHEME,
  ).trim();
  return fromEnv || WORKOS_MOBILE_CALLBACK_SCHEME;
}

/** @param {URLSearchParams | string} raw */
export function wantsWorkOSMobileRedirect(raw) {
  if (raw instanceof URLSearchParams) {
    return raw.get("native") === "1" || raw.get("mobile") === "1";
  }
  return String(raw || "").includes("native=1") || String(raw || "").includes("mobile=1");
}

/** True for phone/tablet browsers (Safari/Chrome) — not the Capacitor WebView. */
export function isMobileExternalBrowserUserAgent(ua) {
  const agent = String(ua || "");
  if (agent.includes("Capacitor") || agent.includes("TheOutreachProject/Capacitor")) return false;
  return /iPhone|iPad|iPod|Android/i.test(agent);
}

/** @param {URLSearchParams} searchParams */
export function buildMobileOAuthCallbackDeepLink(searchParams) {
  const qs = searchParams.toString();
  const base = workosMobileRedirectUri();
  return qs ? `${base}?${qs}` : base;
}

/** @returns {string} */
export function mobileAppUrlScheme() {
  const base = workosMobileRedirectUri();
  const idx = base.indexOf("://");
  return idx > 0 ? base.slice(0, idx) : "com.theoutreachproject.theoutreachproject";
}

/**
 * Deep link that dismisses the Capacitor in-app browser and resumes OAuth in the main WebView.
 * Uses short `key` only — bridge tokens are too long for iOS custom URL schemes.
 * @param {string} [stateKey] sha256 of OAuth state (poll `/api/mobile/oauth-handoff`)
 */
export function buildOAuthBrowserDoneDeepLink(stateKey = "") {
  const scheme = mobileAppUrlScheme();
  const key = String(stateKey || "").trim();
  if (!key) return `${scheme}://oauth/browser-done`;
  return `${scheme}://oauth/browser-done?key=${encodeURIComponent(key)}`;
}

/**
 * @param {string} url
 * @returns {{ key: string, bridge: string } | null}
 */
export function parseOAuthBrowserDoneDeepLink(url) {
  const raw = String(url || "").trim();
  if (!raw.toLowerCase().includes("oauth/browser-done")) return null;
  let key = "";
  let bridge = "";
  try {
    const parsed = new URL(raw);
    key = String(parsed.searchParams.get("key") || "").trim();
    bridge = String(parsed.searchParams.get("bridge") || "").trim();
  } catch {
    const keyMatch = raw.match(/[?&]key=([^&]+)/i);
    if (keyMatch) key = decodeURIComponent(keyMatch[1]);
    const bridgeMatch = raw.match(/[?&]bridge=([^&]+)/i);
    if (bridgeMatch) bridge = decodeURIComponent(bridgeMatch[1]);
  }
  if (!key && !bridge) return null;
  return { key, bridge };
}

/**
 * OAuth finished in Capacitor's in-app browser — auto-return to the native shell via custom URL scheme.
 * @param {string} [stateKey]
 * @param {string} [bridgeToken]
 */
export function mobileOAuthBrowserDoneHtml(stateKey = "") {
  const deepLink = buildOAuthBrowserDoneDeepLink(stateKey);
  const escaped = deepLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const universalLink = buildOAuthHandoffCompleteUniversalLink(stateKey, webBaseUrl());
  const universalEscaped = universalLink
    ? universalLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    : "";
  const headExtra = universalLink
    ? `<meta http-equiv="refresh" content="1;url=${universalEscaped}" />`
    : `<meta http-equiv="refresh" content="0;url=${escaped}" />`;
  const bodyEnd = `<script>
    (function () {
      var link = ${JSON.stringify(deepLink)};
      var universal = ${JSON.stringify(universalLink || "")};
      function openApp() {
        try { window.location.replace(link); } catch (e) {}
      }
      function openUniversal() {
        if (!universal) return;
        try { window.location.replace(universal); } catch (e) {}
      }
      openApp();
      setTimeout(openApp, 120);
      setTimeout(openUniversal, 650);
      setTimeout(function () { try { window.close(); } catch (e) {} }, 900);
    })();
  </script>`;
  return workosAuthBrandedHtmlPage({
    title: "Returning to app — The Outreach Project",
    heading: "Sign in complete",
    showSpinner: true,
    headExtra,
    bodyEnd,
    bodyHtml: `<p class="torpAuth__lead">Returning to The Outreach Project…</p>
      <p class="torpAuth__lead">Your account will open automatically.</p>
      <div class="torpAuth__actions">
        <a class="torpAuth__btn torpAuth__btn--primary" href="${escaped}">Open app</a>
        ${
          universalEscaped
            ? `<a class="torpAuth__btn torpAuth__btn--soft" href="${universalEscaped}">Continue in app</a>`
            : ""
        }
      </div>`,
  });
}

/**
 * Legacy deep-link bridge (external mobile Safari only — not Capacitor Browser sheet).
 * @param {string} deepLinkUrl
 */
export function mobileOAuthReturnBridgeHtml(deepLinkUrl) {
  const safe = String(deepLinkUrl || "").trim();
  const escaped = safe.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return workosAuthBrandedHtmlPage({
    title: "Returning to app — The Outreach Project",
    heading: "Sign in complete",
    bodyHtml: `<p class="torpAuth__lead">Open The Outreach Project to continue.</p>
      <div class="torpAuth__actions">
        <a class="torpAuth__btn torpAuth__btn--primary" href="${escaped}">Open app</a>
      </div>`,
  });
}

/**
 * Parse `org.theoutreachproject.torp://callback?code=…&state=…` → `?code=…&state=…`
 * @param {string} url
 */
export function oauthCallbackQueryFromDeepLink(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!lower.includes("callback")) return null;
  const q = raw.indexOf("?");
  if (q === -1) return null;
  return raw.slice(q);
}
