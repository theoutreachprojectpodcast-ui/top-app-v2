import { NextResponse } from "next/server";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { workosCallbackErrorHtml } from "@/lib/auth/workosGoRoute";
import { workosCallbackErrorMessage, workosOAuthErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { isCapacitorCallbackRequest } from "@/lib/auth/workosCallbackRequest";
import { runWorkOSCallbackDocument, runWorkOSCallbackForFetch } from "@/lib/auth/workosCallbackHandler";
import { hashOAuthState, saveOAuthMobilePending } from "@/lib/auth/oauthMobileHandoffServer";
import { MOBILE_POST_AUTH_HOME } from "@/lib/auth/oauthMobileHandoff";
import {
  buildMobileOAuthCallbackDeepLink,
  isMobileExternalBrowserUserAgent,
  mobileOAuthBrowserDoneHtml,
  mobileOAuthReturnBridgeHtml,
} from "@/lib/auth/workosMobileRedirect";
import { WORKOS_PKCE_COOKIE_NAME } from "@/lib/auth/workosAuthorizationRedirect";
import { oauthStartedInNativeShell } from "@/lib/auth/workosOAuthShell";

const BROWSER_OAUTH_COOKIE = "torp-oauth-browser";

/** @param {Request} request */
function callbackNavHrefs(request) {
  const native = oauthStartedInNativeShell(request);
  return {
    tryAgainHref: native ? workosGoUrl({ mode: "signin", returnTo: "/" }) : "/",
    homeHref: native ? "/mobile" : "/",
  };
}

/** @param {string} message @param {Request} request @param {number} [status] */
function callbackErrorResponse(message, request, status = 400) {
  const { tryAgainHref, homeHref } = callbackNavHrefs(request);
  return new NextResponse(workosCallbackErrorHtml(message, { tryAgainHref, homeHref }), {
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
/** Standalone mobile Safari — deep link into native shell (legacy). */
function mobileBrowserReturnBridgeResponse(url) {
  const deepLink = buildMobileOAuthCallbackDeepLink(url.searchParams);
  return new NextResponse(mobileOAuthReturnBridgeHtml(deepLink), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
  });
}

/** OAuth ran in Capacitor in-app browser (cookie set by `/auth/workos-browser-start`). */
function isCapacitorBrowserOAuthReturn(request) {
  return request.cookies.get(BROWSER_OAUTH_COOKIE)?.value === "1";
}

/** Capacitor in-app browser — stash code/state; WebView finishes OAuth (PKCE cookie lives there). */
async function mobileBrowserOAuthPendingResponse(request, url) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !code) {
    return callbackErrorResponse("Missing sign-in response. Please try again.", request);
  }

  const stateKey = hashOAuthState(state);
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
}

export async function GET(request) {
  const url = new URL(request.url);
  const ua = request.headers.get("user-agent") || "";
  const startedInApp = oauthStartedInNativeShell(request);
  const inMobileBrowser = isMobileExternalBrowserUserAgent(ua);
  const oauthError = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  // In-app browser sheet (Turnstile flow) — save code/state for WebView PKCE completion.
  if (!startedInApp && inMobileBrowser && code && isCapacitorBrowserOAuthReturn(request)) {
    return mobileBrowserOAuthPendingResponse(request, url);
  }

  // Mobile web Safari — PKCE cookie in this browser tab; finish sign-in normally.
  const pkceInBrowser = !!request.cookies.get(WORKOS_PKCE_COOKIE_NAME)?.value;

  // Standalone mobile Safari without PKCE — deep link into native shell (legacy).
  if (!startedInApp && inMobileBrowser && (code || oauthError) && !pkceInBrowser) {
    return mobileBrowserReturnBridgeResponse(url);
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

  try {
    return await runWorkOSCallbackDocument(request);
  } catch (err) {
    console.error("[torp] WorkOS callback failed:", err);
    return callbackErrorResponse(workosCallbackErrorMessage(err), request);
  }
}
