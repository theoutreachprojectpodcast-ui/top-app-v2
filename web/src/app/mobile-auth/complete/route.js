import { NextResponse } from "next/server";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import {
  attachWorkOSSessionCookie,
  consumeMobileSessionTransferToken,
  createMobileSessionTransferToken,
} from "@/lib/auth/mobileSessionTransfer";
import {
  buildMobileAuthCompleteDeepLink,
  buildMobileAuthCompleteUniversalLink,
} from "@/lib/capacitor/mobileDeepLinks";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";
import { resolveMobileNativePostLoginPath } from "@/lib/capacitor/mobilePostLoginReturn";
import { MOBILE_POST_LOGIN_PATH, webBaseUrl } from "@/lib/runtime/appUrls";

export const dynamic = "force-dynamic";

/**
 * Browser-only bridge after mobile WorkOS auth: seal session → deep link / universal link back into Capacitor app.
 * When opened with `?token=` (universal link), exchanges the token and redirects into the logged-in shell.
 */
export async function GET(request) {
  const url = request.nextUrl;
  const tokenParam = String(url.searchParams.get("token") || "").trim();
  const returnTo = resolvePostAuthReturnTarget(url.searchParams.get("returnTo"), "/");

  if (tokenParam) {
    const payload = await consumeMobileSessionTransferToken(tokenParam);
    if (!payload) {
      return NextResponse.redirect(new URL("/sign-in?oauth_error=Sign-in%20expired", request.url), 302);
    }
    const destPath = resolveMobileNativePostLoginPath(
      typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : MOBILE_POST_LOGIN_PATH,
    );
    const dest = new URL(destPath, request.url);
    dest.searchParams.set("oauth", "1");
    const res = NextResponse.redirect(dest, 302);
    attachWorkOSSessionCookie(res, payload.cookieValue);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const { user } = await getWorkOSUserFromCookies();

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("mobile", "1");
    login.searchParams.set("returnTo", typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/");
    return NextResponse.redirect(login);
  }

  const token = await createMobileSessionTransferToken(
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/",
  );
  if (!token) {
    return new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Sign-in incomplete</title></head><body><p>Could not prepare your mobile session. Close this window and try signing in again from the app.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const safeReturn = typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/";
  const deepLink = buildMobileAuthCompleteDeepLink(token, safeReturn);
  const universalLink = buildMobileAuthCompleteUniversalLink(token, safeReturn, webBaseUrl());
  const safeDeepLink = deepLink.replace(/"/g, "&quot;");
  const safeUniversal = universalLink.replace(/"/g, "&quot;");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="1;url=${safeUniversal}" />
  <title>Returning to The Outreach Project…</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:system-ui,sans-serif;
      background:#121212; color:#e8eef6; padding:1.5rem; text-align:center; }
    .spinner { width:44px; height:44px; border:3px solid rgba(34,165,43,.25); border-top-color:#22a52b;
      border-radius:50%; animation:spin .85s linear infinite; margin:0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color:#55d85c; display:inline-block; margin:0.35rem 0.5rem; }
  </style>
</head>
<body>
  <div>
    <div class="spinner" aria-hidden="true"></div>
    <p>Returning to The Outreach Project app…</p>
    <p>
      <a href="${safeDeepLink}">Open app</a>
      ${universalLink ? `<a href="${safeUniversal}">Continue in app</a>` : ""}
    </p>
  </div>
  <script>
    (function () {
      var deep = ${JSON.stringify(deepLink)};
      var universal = ${JSON.stringify(universalLink || "")};
      function openDeep() { try { window.location.replace(deep); } catch (e) {} }
      function openUniversal() { if (universal) try { window.location.replace(universal); } catch (e) {} }
      openDeep();
      setTimeout(openDeep, 120);
      setTimeout(openUniversal, 650);
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
