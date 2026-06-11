import { NextResponse } from "next/server";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { resolveWorkOSSignInFromSearchParams } from "@/lib/auth/workosSignInUrl";
import { resolveWorkOSSignUpFromSearchParams } from "@/lib/auth/workosSignUpUrl";
import { toWorkOSUrlSearchParams } from "@/lib/auth/workosSearchParams";

/**
 * @param {FormData} formData
 */
function paramsFromFormData(formData) {
  const raw = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("_")) continue;
    if (typeof value === "string") raw[key] = value;
  }
  return toWorkOSUrlSearchParams(raw);
}

/**
 * @param {string} message
 * @param {string} [backHref="/mobile"]
 */
function bridgeErrorHtml(message, backHref = "/mobile") {
  const safeMsg = String(message || "Could not start secure sign in.").replace(/</g, "&lt;");
  const safeBack = String(backHref || "/mobile").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 1.5rem; color: #333; background: #f8f9fa; text-align: center; }
    p { max-width: 22rem; line-height: 1.45; }
    a { color: #1a5c34; }
    .warn { color: #9a6700; }
  </style>
</head>
<body>
  <div>
    <p class="warn">${safeMsg}</p>
    <p><a href="${safeBack}">Back</a></p>
  </div>
</body>
</html>`;
}

function bridgeErrorResponse(message, backHref, status = 503) {
  return new NextResponse(bridgeErrorHtml(message, backHref), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * POST form bridge — 200 HTML commits PKCE cookie, then JS navigates to WorkOS.
 * Reliable in Capacitor WKWebView (fetch JSON Set-Cookie is not).
 *
 * @param {Request} request
 * @param {{ mode?: "signin" | "signup" }} options
 */
export async function workOSAuthBridgePost(request, options = {}) {
  const formData = await request.formData();
  const modeFromForm = String(formData.get("_mode") || "").trim();
  const mode =
    options.mode === "signup" || modeFromForm === "signup" ? "signup" : "signin";
  const defaultFallback = mode === "signup" ? "/onboarding" : "/";
  const fallbackReturn = String(formData.get("_fallbackReturn") || defaultFallback).trim() || defaultFallback;
  const backHref = String(formData.get("_backHref") || (fallbackReturn.startsWith("/mobile") ? "/mobile" : "/")).trim();
  const params = paramsFromFormData(formData);
  if (!params.get("returnTo") && fallbackReturn) {
    params.set("returnTo", fallbackReturn);
  }

  try {
    const url =
      mode === "signup"
        ? await resolveWorkOSSignUpFromSearchParams(params, fallbackReturn)
        : await resolveWorkOSSignInFromSearchParams(params, fallbackReturn);
    return workOSAuthRedirectBridge(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "authentication_not_configured" || message === "workos_not_configured") {
      return bridgeErrorResponse("WorkOS AuthKit is not configured yet.", backHref, 503);
    }
    console.error(`[torp] WorkOS ${mode} bridge failed:`, e);
    return bridgeErrorResponse("Could not start secure sign in.", backHref, 503);
  }
}
