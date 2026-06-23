import { NextResponse } from "next/server";
import {
  WORKOS_PKCE_COOKIE_NAME,
  workosPkceCookieOptions,
} from "@/lib/auth/workosAuthorizationRedirect";
import { TOP_OAUTH_POLL_KEY_COOKIE } from "@/lib/auth/oauthMobileHandoff";
import { hashOAuthState } from "@/lib/auth/oauthMobileHandoffServer";
import {
  resolveWorkOSAuthorizeBundleFromGoUrl,
  workOSGoContext,
  workosGoErrorHtml,
} from "@/lib/auth/workosGoRoute";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";

const BROWSER_OAUTH_COOKIE = "top-oauth-browser";
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

function pollKeyCookieOptions() {
  const domain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  return {
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: BROWSER_OAUTH_MAX_AGE,
    ...(domain ? { domain } : {}),
  };
}

/**
 * GET — Capacitor in-app browser entry. Always production-hosted; seeds PKCE on HTML bridge.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const { backHref } = workOSGoContext(url);

  try {
    const bundle = await resolveWorkOSAuthorizeBundleFromGoUrl(url, request);
    const authorizeUrl = String(bundle.url || "").trim();
    const sealedState = String(bundle.sealedState || "").trim();
    if (!authorizeUrl.startsWith("https://") || !sealedState) {
      return new NextResponse("Invalid authorize URL.", { status: 400 });
    }

    const stateKey = hashOAuthState(sealedState);
    const response = workOSAuthRedirectBridge(authorizeUrl);
    response.cookies.set(BROWSER_OAUTH_COOKIE, "1", browserOAuthCookieOptions());
    response.cookies.set(WORKOS_PKCE_COOKIE_NAME, sealedState, workosPkceCookieOptions());
    response.cookies.set(TOP_OAUTH_POLL_KEY_COOKIE, stateKey, pollKeyCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "authentication_not_configured" || message === "workos_not_configured") {
      return new Response(workosGoErrorHtml("Sign-in is not configured yet.", backHref), {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    console.error("[top] WorkOS native browser launch failed:", e);
    const userMessage =
      message && message !== "Error"
        ? message.replace(/</g, "")
        : "Could not start sign in. Please try again.";
    return new Response(workosGoErrorHtml(userMessage, backHref), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
