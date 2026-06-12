import { workosAuthBrandedHtmlPage } from "@/lib/auth/workosAuthBrand";

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
  const json = JSON.stringify(deepLink);
  return workosAuthBrandedHtmlPage({
    title: "Sign in complete — The Outreach Project",
    heading: "Sign in complete",
    showSpinner: true,
    headExtra: `<meta http-equiv="refresh" content="0;url=${escaped}" />`,
    bodyHtml: `<p class="torpAuth__lead">Returning to The Outreach Project…</p>
      <p class="torpAuth__lead"><a class="torpAuth__link" href="${escaped}">Continue in app</a></p>`,
    bodyEnd: `<script>
    (function () {
      var target = ${json};
      function go() {
        try { window.location.replace(target); } catch (e) {}
        try { window.location.href = target; } catch (e2) {}
      }
      go();
      setTimeout(go, 120);
      setTimeout(go, 400);
    })();
  </script>`,
  });
}

/**
 * Legacy deep-link bridge (external mobile Safari only — not Capacitor Browser sheet).
 * @param {string} deepLinkUrl
 */
export function mobileOAuthReturnBridgeHtml(deepLinkUrl) {
  const safe = String(deepLinkUrl || "").trim();
  const escaped = safe.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const json = JSON.stringify(safe);
  return workosAuthBrandedHtmlPage({
    title: "Returning to app — The Outreach Project",
    heading: "Sign in complete",
    bodyHtml: `<p class="torpAuth__lead">Open The Outreach Project to continue.</p>
      <div class="torpAuth__actions">
        <a class="torpAuth__btn torpAuth__btn--primary" href="${escaped}">Open app</a>
      </div>`,
    bodyEnd: `<script>setTimeout(function(){ location.replace(${json}); }, 300);</script>`,
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
