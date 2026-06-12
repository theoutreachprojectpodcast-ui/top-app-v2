import { NextResponse } from "next/server";
import { workosCallbackErrorHtml } from "@/lib/auth/workosGoRoute";
import { workosCallbackErrorMessage, workosOAuthErrorMessage, mobileOAuthSplashErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { isCapacitorCallbackRequest } from "@/lib/auth/workosCallbackRequest";
import {
  runWorkOSCallbackCapture,
  runWorkOSCallbackDocument,
  runWorkOSCallbackForFetch,
} from "@/lib/auth/workosCallbackHandler";
import { saveOAuthMobileSessionHandoff } from "@/lib/auth/oauthMobileHandoffServer";
import { hashOAuthState, saveOAuthMobilePending } from "@/lib/auth/oauthMobileHandoffServer";
import { MOBILE_POST_AUTH_HOME } from "@/lib/auth/oauthMobileHandoff";
import {
  isMobileExternalBrowserUserAgent,
  mobileOAuthBrowserDoneHtml,
} from "@/lib/auth/workosMobileRedirect";
import { oauthStartedInNativeShell } from "@/lib/auth/workosOAuthShell";

export const maxDuration = 60;
export const runtime = "nodejs";

const BROWSER_OAUTH_COOKIE = "torp-oauth-browser";

/** @param {Request} request */
function callbackNavHrefs(request) {
  const native = oauthStartedInNativeShell(request);
  return {
    tryAgainHref: native ? "/sign-in?returnTo=%2F" : "/sign-in?returnTo=%2F",
    homeHref: native ? "/" : "/",
  };
}

/** @param {string} message @param {Request} request @param {number} [status] */
function callbackErrorResponse(message, request, status = 400) {
  const safeMessage = mobileOAuthSplashErrorMessage(message) || message;
  if (oauthStartedInNativeShell(request) && !isCapacitorCallbackRequest(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("oauth_error", safeMessage);
    return NextResponse.redirect(signIn, { status: 302, headers: { "Cache-Control": "no-store" } });
  }
  const { tryAgainHref, homeHref } = callbackNavHrefs(request);
  return new NextResponse(workosCallbackErrorHtml(safeMessage, { tryAgainHref, homeHref }), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * WorkOS Redirect URI — https://theoutreachproject.app/callback
 * Route Handler (not RSC page) so AuthKit can set session cookies.
 */
/** OAuth ran in Capacitor in-app browser (cookie set by `/auth/workos-browser-start`). */
function isCapacitorBrowserOAuthReturn(request) {
  return request.cookies.get(BROWSER_OAUTH_COOKIE)?.value === "1";
}

/** Capacitor in-app browser — finish OAuth here (PKCE cookie from `/auth/workos-browser-start`), hand session to WebView. */
async function mobileBrowserOAuthPendingResponse(request, url) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !code) {
    return callbackErrorResponse("Missing sign-in response. Please try again.", request);
  }

  try {
    const stateKey = hashOAuthState(state);

    const captured = await runWorkOSCallbackCapture(request);
    if (captured.ok && captured.setCookies?.length) {
      const saved = await saveOAuthMobileSessionHandoff(stateKey, captured.setCookies, captured.redirectTo);
      if (saved.ok) {
        return new NextResponse(mobileOAuthBrowserDoneHtml(stateKey), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": "inline",
            "Cache-Control": "no-store",
          },
        });
      }
      console.error("[torp] oauth session handoff save failed after capture");
    } else if (!captured.ok) {
      console.error("[torp] oauth in-app browser capture failed:", captured.message);
      return callbackErrorResponse(captured.message, request);
    }

    const saved = await saveOAuthMobilePending(stateKey, code, state, MOBILE_POST_AUTH_HOME);
    if (!saved.ok) {
      return callbackErrorResponse("Could not prepare sign-in for the app. Please try again.", request);
    }

    return new NextResponse(mobileOAuthBrowserDoneHtml(stateKey), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[torp] mobile browser oauth callback failed:", err);
    return callbackErrorResponse(workosCallbackErrorMessage(err), request);
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const inMobileBrowser = isMobileExternalBrowserUserAgent(ua);
    const oauthError = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    // Capacitor in-app browser (SFSafariViewController) — session cookies stay in the browser jar;
    // capture them and hand off to the WKWebView via Supabase + /api/mobile/oauth-handoff/complete.
    // `torp-oauth-browser=1` is authoritative; do not gate on `torp-oauth-shell` (also set in browser).
    if (inMobileBrowser && code && isCapacitorBrowserOAuthReturn(request)) {
      return mobileBrowserOAuthPendingResponse(request, url);
    }

    if (oauthError) {
      return callbackErrorResponse(
        workosOAuthErrorMessage(oauthError, url.searchParams.get("error_description") || ""),
        request,
      );
    }

    if (!code) {
      return callbackErrorResponse("Missing sign-in response. Please try again.", request);
    }

    if (isCapacitorCallbackRequest(request)) {
      return runWorkOSCallbackForFetch(request);
    }

    return await runWorkOSCallbackDocument(request);
  } catch (err) {
    console.error("[torp] WorkOS callback failed:", err);
    return callbackErrorResponse(workosCallbackErrorMessage(err), request);
  }
}
