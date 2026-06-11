import { NextResponse } from "next/server";
import {
  WORKOS_PKCE_COOKIE_NAME,
  workosPkceCookieOptions,
} from "@/lib/auth/workosAuthorizationRedirect";

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
 * GET — seeds PKCE + shell marker cookies in the in-app browser (SFSafariViewController),
 * then redirects to WorkOS. The main WebView mints PKCE first; this copies the sealed state
 * into the browser cookie jar so `/callback` can validate state.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const go = String(url.searchParams.get("go") || "").trim();
  if (!go.startsWith("https://")) {
    return new NextResponse("Invalid authorize URL.", { status: 400 });
  }

  let sealedState = "";
  try {
    sealedState = String(new URL(go).searchParams.get("state") || "").trim();
  } catch {
    return new NextResponse("Invalid authorize URL.", { status: 400 });
  }
  if (!sealedState) {
    return new NextResponse("Missing OAuth state.", { status: 400 });
  }

  const res = NextResponse.redirect(go, 302);
  res.cookies.set(BROWSER_OAUTH_COOKIE, "1", browserOAuthCookieOptions());
  res.cookies.set(WORKOS_PKCE_COOKIE_NAME, sealedState, workosPkceCookieOptions());
  res.headers.set("Cache-Control", "no-store");
  return res;
}
