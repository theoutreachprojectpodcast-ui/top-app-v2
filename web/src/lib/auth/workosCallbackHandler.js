import { NextResponse } from "next/server";
import { handleAuth } from "@workos-inc/authkit-nextjs";
import { requestOriginForStripeRedirects } from "@/lib/billing/stripeConfig";
import { isCapacitorCallbackRequest } from "@/lib/auth/workosCallbackRequest";
import { workosCallbackErrorMessage } from "@/lib/auth/workosCallbackErrors";
import { workosCallbackErrorHtml } from "@/lib/auth/workosGoRoute";
import { resolveMobileAppPostAuthPath } from "@/lib/auth/workosCallbackServer";
import { onWorkOSSuccess } from "@/lib/auth/workosAuthSuccess";
import { oauthShellClearCookieHeader, oauthStartedInNativeShell } from "@/lib/auth/workosOAuthShell";

/** @param {Request} request @param {Response} response */
function patchNativeShellCallbackRedirect(request, response) {
  if (!response || response.status < 300 || response.status >= 400) return response;
  if (!oauthStartedInNativeShell(request)) return response;

  const ua = request.headers.get("user-agent") || "";
  const location = response.headers.get("Location") || "";
  let redirectTo = "/";
  if (location) {
    try {
      const u = new URL(location, request.url);
      redirectTo = `${u.pathname}${u.search}`;
    } catch {
      redirectTo = "/";
    }
  }
  redirectTo = resolveMobileAppPostAuthPath(redirectTo, ua, true);
  response.headers.set("Location", new URL(redirectTo, request.url).toString());
  response.headers.append("Set-Cookie", oauthShellClearCookieHeader());
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** @param {Request} request */
export function createWorkOSCallbackHandler(request) {
  const baseURL = requestOriginForStripeRedirects(request);
  return handleAuth({
    returnPathname: "/",
    baseURL,
    onSuccess: onWorkOSSuccess,
    onError: async ({ error, request: req }) => {
      console.error("[torp] WorkOS callback failed:", error?.message || error);
      const description = workosCallbackErrorMessage(error);
      if (req && isCapacitorCallbackRequest(req)) {
        return NextResponse.json(
          {
            error: {
              message: "Authentication failed",
              description,
            },
          },
          { status: 400 },
        );
      }
      const native = req ? oauthStartedInNativeShell(req) : false;
      return new NextResponse(
        workosCallbackErrorHtml(description, {
          tryAgainHref: native ? "/sign-in?returnTo=%2F" : "/sign-in?returnTo=%2F",
          homeHref: native ? "/mobile" : "/",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": "inline",
            "Cache-Control": "no-store",
          },
        },
      );
    },
  });
}

/** @param {Response} response */
function extractSetCookies(response) {
  if (!response?.headers) return [];
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

/** Copy Set-Cookie headers from an auth handler response onto another response. */
export function forwardAuthSetCookies(from, to) {
  if (!from?.headers) return;
  if (typeof from.headers.getSetCookie === "function") {
    for (const cookie of from.headers.getSetCookie()) {
      to.headers.append("Set-Cookie", cookie);
    }
    return;
  }
  const single = from.headers.get("set-cookie");
  if (single) to.headers.append("Set-Cookie", single);
}

/**
 * Complete OAuth in the in-app browser sheet and capture session cookies for WKWebView handoff.
 * @param {Request} request
 * @returns {Promise<{ ok: true, setCookies: string[], redirectTo: string } | { ok: false, message: string }>}
 */
export async function runWorkOSCallbackCapture(request) {
  const handler = createWorkOSCallbackHandler(request);
  let response;
  try {
    response = await handler(request);
  } catch (err) {
    return { ok: false, message: workosCallbackErrorMessage(err) };
  }
  if (!response) {
    return { ok: false, message: "Could not complete sign in. Please try again." };
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location") || "";
    let redirectTo = "/";
    if (location) {
      try {
        const u = new URL(location, request.url);
        redirectTo = `${u.pathname}${u.search}`;
      } catch {
        redirectTo = "/";
      }
    }
    redirectTo = resolveMobileAppPostAuthPath(redirectTo, "TheOutreachProject/Capacitor", true);
    return { ok: true, setCookies: extractSetCookies(response), redirectTo };
  }

  let message = "Could not complete sign in. Please try again.";
  try {
    const body = await response.json();
    message = body?.error?.description || body?.error?.message || message;
  } catch {
    /* ignore */
  }
  return { ok: false, message };
}

/**
 * Run WorkOS callback for Capacitor / fetch clients — JSON + Set-Cookie (no route-handler navigation).
 * @param {Request} request
 */
export async function runWorkOSCallbackForFetch(request) {
  const handler = createWorkOSCallbackHandler(request);
  let inner;
  try {
    inner = await handler(request);
  } catch (err) {
    console.error("[torp] WorkOS callback handler threw:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "workos_callback_failed",
        message: workosCallbackErrorMessage(err),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!inner) {
    return NextResponse.json(
      {
        ok: false,
        error: "workos_callback_failed",
        message: "Could not complete sign in. Please try again.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const location = inner.headers.get("Location") || "";
  let redirectTo = "/";
  if (location) {
    try {
      const u = new URL(location, request.url);
      redirectTo = `${u.pathname}${u.search}`;
    } catch {
      redirectTo = "/";
    }
  }

  redirectTo = resolveMobileAppPostAuthPath(
    redirectTo,
    request.headers.get("user-agent") || "",
    isCapacitorCallbackRequest(request),
  );

  const ok = inner.status >= 300 && inner.status < 400;
  if (!ok) {
    let message = "Could not complete sign in. Please try again.";
    try {
      const body = await inner.json();
      message = body?.error?.description || body?.error?.message || message;
    } catch {
      /* ignore */
    }
    const out = NextResponse.json({ ok: false, error: "workos_callback_failed", message }, { status: 400 });
    forwardAuthSetCookies(inner, out);
    return out;
  }

  const out = NextResponse.json(
    { ok: true, redirectTo },
    { headers: { "Cache-Control": "no-store" } },
  );
  forwardAuthSetCookies(inner, out);
  return out;
}

/**
 * Document navigation to `/callback?code=…` — return AuthKit's response directly so
 * `saveSession()` cookies from `cookies()` are not dropped by a rebuilt redirect.
 * @param {Request} request
 */
export async function runWorkOSCallbackDocument(request) {
  const handler = createWorkOSCallbackHandler(request);
  let response;
  try {
    response = await handler(request);
  } catch (err) {
    throw new Error(workosCallbackErrorMessage(err));
  }

  if (!response) {
    throw new Error("Could not complete sign in. Please try again.");
  }

  return patchNativeShellCallbackRedirect(request, response);
}

/**
 * @param {Request} request
 */
export async function runWorkOSCallback(request) {
  if (isCapacitorCallbackRequest(request)) {
    return runWorkOSCallbackForFetch(request);
  }
  return runWorkOSCallbackDocument(request);
}
