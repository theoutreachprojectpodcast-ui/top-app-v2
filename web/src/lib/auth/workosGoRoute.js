import { NextResponse } from "next/server";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { resolveWorkOSSignInFromSearchParams } from "@/lib/auth/workosSignInUrl";
import { resolveWorkOSSignUpFromSearchParams } from "@/lib/auth/workosSignUpUrl";
import { toWorkOSUrlSearchParams } from "@/lib/auth/workosSearchParams";

/**
 * @param {string} message
 * @param {string} [backHref="/mobile"]
 */
export function workosGoErrorHtml(message, backHref = "/mobile") {
  const safeMsg = String(message || "Could not start sign in.").replace(/</g, "&lt;");
  const safeBack = String(backHref).replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Sign in</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100dvh; align-items: center; justify-content: center; margin: 0; padding: 24px; background: #101814; color: #f8fcfa; text-align: center; }
    .card { max-width: 22rem; padding: 20px; border-radius: 16px; background: #1a2420; border: 1px solid #3a4a40; }
    p { margin: 0 0 16px; line-height: 1.45; font-size: 0.95rem; }
    a { display: inline-block; padding: 12px 20px; border-radius: 999px; background: #1a5c34; color: #fff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <p>${safeMsg}</p>
    <a href="${safeBack}">Try again</a>
  </div>
</body>
</html>`;
}

/**
 * OAuth callback error page (Route Handler — cookies cannot be set from RSC pages).
 * @param {string} message
 * @param {{ tryAgainHref?: string, homeHref?: string }} [options]
 */
export function workosCallbackErrorHtml(
  message,
  { tryAgainHref = "/auth/workos-go?mode=signin&returnTo=/", homeHref = "/mobile" } = {},
) {
  const safeMsg = String(message || "Could not complete sign in.").replace(/</g, "&lt;");
  const safeTry = String(tryAgainHref).replace(/"/g, "&quot;");
  const safeHome = String(homeHref).replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Sign in</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100dvh; align-items: center; justify-content: center; margin: 0; padding: 24px; background: #101814; color: #f8fcfa; text-align: center; }
    .card { max-width: 22rem; width: 100%; padding: 20px; border-radius: 16px; background: #1a2420; border: 1px solid #3a4a40; }
    p { margin: 0 0 16px; line-height: 1.45; font-size: 0.95rem; color: #f5d76e; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    a { display: block; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 600; }
    .primary { background: #1a5c34; color: #fff; }
    .soft { background: #2a3530; color: #f8fcfa; border: 1px solid #3a4a40; }
  </style>
</head>
<body>
  <div class="card">
    <p role="alert">${safeMsg}</p>
    <div class="actions">
      <a class="primary" href="${safeTry}">Try again</a>
      <a class="soft" href="${safeHome}">Home</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * @param {URL} requestUrl
 */
function workOSGoContext(requestUrl) {
  const mode = requestUrl.searchParams.get("mode") === "signup" ? "signup" : "signin";
  const fallbackReturn = mode === "signup" ? "/onboarding" : "/";
  const backHref =
    String(requestUrl.searchParams.get("back") || "").trim() ||
    (fallbackReturn.startsWith("/mobile") ? "/mobile" : "/");
  const params = toWorkOSUrlSearchParams(Object.fromEntries(requestUrl.searchParams));
  if (!params.get("returnTo")) {
    params.set("returnTo", fallbackReturn);
  }
  return { mode, fallbackReturn, backHref, params };
}

/**
 * @param {URL} requestUrl
 */
export async function resolveWorkOSAuthorizeUrlFromGoUrl(requestUrl) {
  const { mode, fallbackReturn, params } = workOSGoContext(requestUrl);
  return mode === "signup"
    ? resolveWorkOSSignUpFromSearchParams(params, fallbackReturn)
    : resolveWorkOSSignInFromSearchParams(params, fallbackReturn);
}

function workOSGoErrorResponse(message, backHref, status = 503) {
  return new Response(workosGoErrorHtml(message, backHref), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * @param {URL} requestUrl
 */
export async function workOSGoJsonResponse(requestUrl) {
  const { backHref } = workOSGoContext(requestUrl);
  try {
    const url = await resolveWorkOSAuthorizeUrlFromGoUrl(requestUrl);
    let stateKey = "";
    try {
      const sealed = new URL(String(url)).searchParams.get("state") || "";
      if (sealed) {
        const { hashOAuthState } = await import("@/lib/auth/oauthMobileHandoffServer");
        stateKey = hashOAuthState(sealed);
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      { ok: true, url, stateKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "authentication_not_configured" || message === "workos_not_configured") {
      return NextResponse.json(
        { ok: false, message: "Sign-in is not configured yet." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[torp] WorkOS go JSON failed:", e);
    const userMessage =
      message && message !== "Error"
        ? message.replace(/</g, "")
        : "Could not start sign in. Please try again.";
    return NextResponse.json(
      { ok: false, message: userMessage },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * @param {URL} requestUrl
 */
export async function workOSGoResponse(requestUrl) {
  const { backHref } = workOSGoContext(requestUrl);
  try {
    const url = await resolveWorkOSAuthorizeUrlFromGoUrl(requestUrl);
    return workOSAuthRedirectBridge(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "authentication_not_configured" || message === "workos_not_configured") {
      return workOSGoErrorResponse("Sign-in is not configured yet.", backHref);
    }
    console.error("[torp] WorkOS go route failed:", e);
    const userMessage =
      message && message !== "Error"
        ? message.replace(/</g, "")
        : "Could not start sign in. Please try again.";
    return workOSGoErrorResponse(userMessage, backHref);
  }
}
