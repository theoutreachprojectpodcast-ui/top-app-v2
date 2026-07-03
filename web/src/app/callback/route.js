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
import { resolveOAuthHandoffPollKey, saveOAuthMobilePending } from "@/lib/auth/oauthMobileHandoffServer";
import { oauthStateFromAuthorizeUrl } from "@/lib/auth/workosAuthorizationRedirect";
import { TOP_OAUTH_POLL_KEY_COOKIE } from "@/lib/auth/oauthMobileHandoff";
import { MOBILE_POST_AUTH_HOME } from "@/lib/auth/oauthMobileHandoff";
import {
  isMobileExternalBrowserUserAgent,
  mobileOAuthBrowserDoneHtml,
} from "@/lib/auth/workosMobileRedirect";
import { oauthStartedInNativeShell, isNativeWorkOSShellRequest } from "@/lib/auth/workosOAuthShell";

export const maxDuration = 60;
export const runtime = "nodejs";

const BROWSER_OAUTH_COOKIE = "top-oauth-browser";

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
/** Capacitor in-app browser — markers from `/auth/workos-browser-start` only (not generic PKCE). */
function isCapacitorBrowserOAuthReturn(request) {
  if (request.cookies.get(BROWSER_OAUTH_COOKIE)?.value === "1") return true;
  return !!String(request.cookies.get(TOP_OAUTH_POLL_KEY_COOKIE)?.value || "").trim();
}

/** Capacitor in-app browser — finish OAuth here (PKCE cookie from `/auth/workos-browser-start`), hand session to WebView. */
async function mobileBrowserOAuthPendingResponse(request, url) {
  const code = url.searchParams.get("code");
  const stateRaw =
    oauthStateFromAuthorizeUrl(url.toString()) || String(url.searchParams.get("state") || "").trim();
  if (!stateRaw || !code) {
    return callbackErrorResponse("Missing sign-in response. Please try again.", request);
  }

  const stateKey = resolveOAuthHandoffPollKey(request, url.toString());
  if (!stateKey) {
    return callbackErrorResponse("Could not verify sign-in session. Please try again.", request);
  }

  try {
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
      console.error("[top] oauth session handoff save failed after capture");
    } else if (!captured.ok) {
      console.error("[top] oauth in-app browser capture failed:", captured.message);
      return callbackErrorResponse(captured.message, request);
    }

    const saved = await saveOAuthMobilePending(stateKey, code, stateRaw, MOBILE_POST_AUTH_HOME);
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
    console.error("[top] mobile browser oauth callback failed:", err);
    return callbackErrorResponse(workosCallbackErrorMessage(err), request);
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const inMobileBrowser = isMobileExternalBrowserUserAgent(ua);
    const nativeShell = isNativeWorkOSShellRequest(request);
    const oauthError = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    if (oauthError) {
      return callbackErrorResponse(
        workosOAuthErrorMessage(oauthError, url.searchParams.get("error_description") || ""),
        request,
      );
    }

    if (!code) {
      return callbackErrorResponse("Missing sign-in response. Please try again.", request);
    }

    // Capacitor main WebView — complete OAuth here (session cookies stay in the shell).
    if (nativeShell && !isCapacitorCallbackRequest(request)) {
      return await runWorkOSCallbackDocument(request);
    }

    // Legacy in-app browser sheet only (external Safari UA without native shell cookies).
    if (inMobileBrowser && isCapacitorBrowserOAuthReturn(request)) {
      return mobileBrowserOAuthPendingResponse(request, url);
    }

    if (isCapacitorCallbackRequest(request)) {
      return runWorkOSCallbackForFetch(request);
    }

    return await runWorkOSCallbackDocument(request);
  } catch (err) {
    console.error("[top] WorkOS callback failed:", err);
    return callbackErrorResponse(workosCallbackErrorMessage(err), request);
  }
}
