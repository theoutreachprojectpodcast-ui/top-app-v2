import { NextResponse } from "next/server";
import {
  WORKOS_PKCE_COOKIE_NAME,
  oauthStateFromAuthorizeUrl,
  workosPkceCookieOptions,
} from "@/lib/auth/workosAuthorizationRedirect";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";

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
 * SFSafariViewController), then navigates to WorkOS. Pass sealed OAuth state as `s`
 * from `/auth/workos-go?format=json` to avoid re-parsing the authorize URL.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const go = String(url.searchParams.get("go") || "").trim();
  if (!go.startsWith("https://")) {
    return new NextResponse("Invalid authorize URL.", { status: 400 });
  }

  const sealedParam = String(url.searchParams.get("s") || "").trim();
  const sealedState = sealedParam || oauthStateFromAuthorizeUrl(go);
  if (!sealedState) {
    return new NextResponse("Missing OAuth state.", { status: 400 });
  }

  const response = workOSAuthRedirectBridge(go);
  response.cookies.set(BROWSER_OAUTH_COOKIE, "1", browserOAuthCookieOptions());
  response.cookies.set(WORKOS_PKCE_COOKIE_NAME, sealedState, workosPkceCookieOptions());
  return response;
}
