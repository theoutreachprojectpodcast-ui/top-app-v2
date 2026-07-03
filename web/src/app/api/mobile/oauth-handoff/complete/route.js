import { NextResponse } from "next/server";
import { consumeOAuthMobileSessionHandoff } from "@/lib/auth/oauthMobileHandoffServer";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

/**
 * GET — apply WorkOS session cookies captured in the in-app browser, then redirect into the app.
 * One-time use; keyed by sha256(OAuth state) from the WebView poll / deep link.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const stateKey = String(url.searchParams.get("key") || "").trim();
  if (!stateKey) {
    return NextResponse.redirect(
      new URL("/mobile?oauth_error=Missing%20sign-in%20key", request.url),
      302,
    );
  }

  const handoff = await consumeOAuthMobileSessionHandoff(stateKey);
  if (!handoff?.setCookies?.length) {
    return NextResponse.redirect(
      new URL("/mobile?oauth_error=Sign-in%20expired", request.url),
      302,
    );
  }

  let redirectTo = String(handoff.redirectTo || "/").trim() || "/";
  if (!redirectTo.startsWith("/")) {
    redirectTo = "/";
  }
  if (
    redirectTo === MOBILE_POST_LOGIN_PATH ||
    redirectTo === "/mobile/auth/complete" ||
    redirectTo === "/?oauth=1"
  ) {
    redirectTo = "/";
  }

  const dest = new URL(redirectTo, request.url);
  dest.searchParams.set("oauth", "1");
  const res = NextResponse.redirect(dest, 302);
  for (const cookie of handoff.setCookies) {
    if (cookie) res.headers.append("Set-Cookie", cookie);
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
