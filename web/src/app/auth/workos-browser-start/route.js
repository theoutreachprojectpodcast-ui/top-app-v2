import { NextResponse } from "next/server";
import {
  WORKOS_PKCE_COOKIE_NAME,
  oauthStateFromAuthorizeUrl,
  workosPkceCookieOptions,
} from "@/lib/auth/workosAuthorizationRedirect";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { peekOAuthAuthorizePending } from "@/lib/auth/oauthMobileHandoffServer";
import { oauthShellSetCookieHeader } from "@/lib/auth/workosOAuthShell";

const BROWSER_OAUTH_COOKIE = "torp-oauth-browser";
const BROWSER_OAUTH_MAX_AGE = 600;

function browserOAuthCookieOptions() {
  const domain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  return {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: BROWSER_OAUTH_MAX_AGE,
    ...(domain ? { domain } : {}),
  };
}

/**
 * GET — seeds PKCE + browser marker cookies on the HTML bridge response (reliable in
 * SFSafariViewController), then navigates to WorkOS.
 *
 * Prefer `?key=` (short URL for Capacitor Browser.open); legacy `?go=` + `s=` still supported.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const stateKey = String(url.searchParams.get("key") || "").trim();

  let authorizeUrl = "";
  let sealedState = "";

  if (stateKey) {
    const pending = await peekOAuthAuthorizePending(stateKey);
    if (!pending) {
      return new NextResponse("Sign-in session expired. Close the browser and try again.", {
        status: 410,
      });
    }
    authorizeUrl = pending.url;
    sealedState = pending.sealedState;
  } else {
    authorizeUrl = String(url.searchParams.get("go") || "").trim();
    if (!authorizeUrl.startsWith("https://")) {
      return new NextResponse("Invalid authorize URL.", { status: 400 });
    }
    const sealedParam = String(url.searchParams.get("s") || "").trim();
    sealedState = sealedParam || oauthStateFromAuthorizeUrl(authorizeUrl);
  }

  if (!authorizeUrl.startsWith("https://") || !sealedState) {
    return new NextResponse("Missing OAuth state.", { status: 400 });
  }

  const response = workOSAuthRedirectBridge(authorizeUrl);
  response.cookies.set(BROWSER_OAUTH_COOKIE, "1", browserOAuthCookieOptions());
  response.cookies.set(WORKOS_PKCE_COOKIE_NAME, sealedState, workosPkceCookieOptions());
  if (stateKey) {
    response.headers.append("Set-Cookie", oauthShellSetCookieHeader());
  }
  return response;
}
