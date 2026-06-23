import { NextResponse } from "next/server";
import { workosAuthBrandedHtmlPage } from "@/lib/auth/workosAuthBrand";

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

  const html = workosAuthBrandedHtmlPage({
    title: "Sign in — The Outreach Project",
    heading: "Secure sign in",
    showSpinner: true,
    headExtra: `<meta http-equiv="refresh" content="0;url=${escaped}" />`,
    bodyHtml: `<p class="topAuth__lead">Redirecting to secure sign in…</p>
      <p class="topAuth__lead"><a class="topAuth__link" href="${escaped}">Continue</a></p>`,
    bodyEnd: `<script>location.replace(${JSON.stringify(safe)});</script>`,
  });

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
