import { NextResponse } from "next/server";

/**
 * Same-origin 200 HTML bridge before navigating to WorkOS AuthKit.
 *
 * Setting the PKCE cookie on a 307 redirect to an external IdP is unreliable in Chrome
 * (especially incognito): the browser may drop Set-Cookie before leaving the site.
 * A 200 response commits cookies, then client JS navigates to WorkOS.
 *
 * Mobile WebView: POST `/auth/workos-handoff` (form submit) returns this HTML — avoids
 * fetch JSON Set-Cookie races and Capacitor `/api/*` navigation crashes.
 *
 * @param {string} workosUrl
 * @param {{ extraSetCookies?: string[] }} [options]
 */
export function workOSAuthRedirectBridge(workosUrl, options = {}) {
  const safe = String(workosUrl || "").trim();
  if (!safe.startsWith("https://")) {
    return NextResponse.json({ error: "invalid_workos_redirect" }, { status: 500 });
  }

  const escaped = safe.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${escaped}" />
  <title>Redirecting…</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; color: #333; background: #f8f9fa; }
    a { color: #1a5c34; }
  </style>
</head>
<body>
  <p>Redirecting to secure sign in… <a href="${escaped}">Continue</a></p>
  <script>location.replace(${JSON.stringify(safe)});</script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
  for (const cookie of options.extraSetCookies || []) {
    if (cookie) response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
