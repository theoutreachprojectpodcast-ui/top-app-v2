import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKOS_PKCE_COOKIE_NAME,
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
 * GET — seeds PKCE + shell marker cookies in the in-app browser (SFSafariViewController),
 * then navigates to WorkOS via a 200 HTML bridge (302 Set-Cookie is unreliable in SFSafariViewController).
 * The main WebView mints PKCE first; this copies the sealed state into the browser cookie jar.
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

  const cookieStore = await cookies();
  cookieStore.set(BROWSER_OAUTH_COOKIE, "1", browserOAuthCookieOptions());
  cookieStore.set(WORKOS_PKCE_COOKIE_NAME, sealedState, workosPkceCookieOptions());
  return workOSAuthRedirectBridge(go);
}
