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

/**
 * OAuth finished in Capacitor's in-app browser (SFSafariViewController).
 * Custom URL schemes do not work here — user closes the sheet (Done); WKWebView claims the session via handoff API.
 */
export function mobileOAuthBrowserDoneHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Sign-in complete</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100dvh; align-items: center; justify-content: center; margin: 0; padding: 24px; background: #101814; color: #f8fcfa; text-align: center; }
    .card { max-width: 22rem; padding: 20px; border-radius: 16px; background: #1a2420; border: 1px solid #3a4a40; }
    p { margin: 0 0 12px; line-height: 1.45; font-size: 0.95rem; }
    p.hint { font-size: 0.85rem; color: #b8c8be; }
    strong { color: #9fd4b0; }
  </style>
</head>
<body>
  <div class="card">
    <p>Sign-in complete.</p>
    <p>Returning to The Outreach Project…</p>
    <p class="hint">If nothing happens, tap <strong>Done</strong> at the top of this screen.</p>
  </div>
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
