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
 * @param {string} stateKey sha256 of OAuth state (matches `/api/mobile/oauth-handoff` poll key)
 */
export function buildOAuthBrowserDoneDeepLink(stateKey) {
  const key = String(stateKey || "").trim();
  const scheme = mobileAppUrlScheme();
  const qs = key ? `?key=${encodeURIComponent(key)}` : "";
  return `${scheme}://oauth/browser-done${qs}`;
}

/**
 * @param {string} url
 * @returns {{ key: string } | null}
 */
export function parseOAuthBrowserDoneDeepLink(url) {
  const raw = String(url || "").trim();
  if (!raw.toLowerCase().includes("oauth/browser-done")) return null;
  let key = "";
  try {
    const parsed = new URL(raw);
    key = String(parsed.searchParams.get("key") || "").trim();
  } catch {
    const match = raw.match(/[?&]key=([^&]+)/i);
    if (match) key = decodeURIComponent(match[1]);
  }
  return { key };
}

/**
 * OAuth finished in Capacitor's in-app browser — auto-return to the native shell via custom URL scheme.
 * @param {string} [stateKey]
 */
export function mobileOAuthBrowserDoneHtml(stateKey = "") {
  const deepLink = buildOAuthBrowserDoneDeepLink(stateKey);
  const escaped = deepLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const json = JSON.stringify(deepLink);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta http-equiv="refresh" content="0;url=${escaped}" />
  <title>Sign-in complete</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100dvh; align-items: center; justify-content: center; margin: 0; padding: 24px; background: #101814; color: #f8fcfa; text-align: center; }
    .card { max-width: 22rem; padding: 20px; border-radius: 16px; background: #1a2420; border: 1px solid #3a4a40; }
    p { margin: 0 0 12px; line-height: 1.45; font-size: 0.95rem; }
    a { color: #9fd4b0; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <p>Sign-in complete.</p>
    <p>Returning to The Outreach Project…</p>
    <p><a href="${escaped}">Continue in app</a></p>
  </div>
  <script>
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
  </script>
</body>
</html>`;
}

/**
 * Legacy deep-link bridge (external mobile Safari only — not Capacitor Browser sheet).
 * @param {string} deepLinkUrl
 */
export function mobileOAuthReturnBridgeHtml(deepLinkUrl) {
  const safe = String(deepLinkUrl || "").trim();
  const escaped = safe.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const json = JSON.stringify(safe);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Returning to app…</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100dvh; align-items: center; justify-content: center; margin: 0; padding: 24px; background: #101814; color: #f8fcfa; text-align: center; }
    .card { max-width: 22rem; padding: 20px; border-radius: 16px; background: #1a2420; border: 1px solid #3a4a40; }
    p { margin: 0 0 16px; line-height: 1.45; font-size: 0.95rem; }
    a { display: inline-block; padding: 12px 20px; border-radius: 999px; background: #1a5c34; color: #fff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <p>Sign-in complete. Open The Outreach Project to continue.</p>
    <a href="${escaped}">Open app</a>
  </div>
  <script>setTimeout(function(){ location.replace(${json}); }, 300);</script>
</body>
</html>`;
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
