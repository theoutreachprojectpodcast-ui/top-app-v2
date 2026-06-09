import { NextResponse } from "next/server";

/**
 * Same-origin 200 HTML bridge before navigating to WorkOS AuthKit.
 *
 * Setting the PKCE cookie on a 307 redirect to an external IdP is unreliable in Chrome
 * (especially incognito): the browser may drop Set-Cookie before leaving the site.
 * A 200 response commits cookies, then client JS navigates to WorkOS.
 *
 * @param {string} workosUrl
 */
export function workOSAuthRedirectBridge(workosUrl) {
  const safe = String(workosUrl || "").trim();
  if (!safe.startsWith("https://")) {
    return NextResponse.json({ error: "invalid_workos_redirect" }, { status: 500 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting…</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; color: #333; background: #f8f9fa; }
  </style>
</head>
<body>
  <p>Redirecting to secure sign in…</p>
  <script>location.replace(${JSON.stringify(safe)});</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
