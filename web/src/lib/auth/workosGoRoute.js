import { NextResponse } from "next/server";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { workosAuthBrandedHtmlPage } from "@/lib/auth/workosAuthBrand";
import { shouldMarkOAuthNativeShell } from "@/lib/auth/workosOAuthShell";
import { attachWorkOSAuthorizeCookies } from "@/lib/auth/workosAuthorizationRedirect";
import { hashOAuthState, saveOAuthAuthorizePending } from "@/lib/auth/oauthMobileHandoffServer";
import { resolveWorkOSSignInBundleFromSearchParams } from "@/lib/auth/workosSignInUrl";
import { resolveWorkOSSignUpBundleFromSearchParams } from "@/lib/auth/workosSignUpUrl";
import { toWorkOSUrlSearchParams } from "@/lib/auth/workosSearchParams";

/**
 * @param {string} message
 * @param {string} [backHref="/mobile"]
 */
export function workosGoErrorHtml(message, backHref = "/mobile") {
  const safeMsg = String(message || "Could not start sign in.").replace(/</g, "&lt;");
  const safeBack = String(backHref).replace(/"/g, "&quot;");
  return workosAuthBrandedHtmlPage({
    title: "Sign in — The Outreach Project",
    heading: "Sign in",
    bodyHtml: `<p class="torpAuth__lead torpAuth__lead--warn" role="alert">${safeMsg}</p>
      <div class="torpAuth__actions">
        <a class="torpAuth__btn torpAuth__btn--primary" href="${safeBack}">Try again</a>
      </div>`,
  });
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
  return workosAuthBrandedHtmlPage({
    title: "Sign in — The Outreach Project",
    heading: "Sign in",
    bodyHtml: `<p class="torpAuth__lead torpAuth__lead--warn" role="alert">${safeMsg}</p>
      <div class="torpAuth__actions">
        <a class="torpAuth__btn torpAuth__btn--primary" href="${safeTry}">Try again</a>
        <a class="torpAuth__btn torpAuth__btn--soft" href="${safeHome}">Home</a>
      </div>`,
  });
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
 * @param {Request} [request]
 * @returns {Promise<{ url: string, sealedState: string }>}
 */
export async function resolveWorkOSAuthorizeBundleFromGoUrl(requestUrl, request) {
  const { mode, fallbackReturn, params } = workOSGoContext(requestUrl);
  return mode === "signup"
    ? resolveWorkOSSignUpBundleFromSearchParams(params, fallbackReturn, request)
    : resolveWorkOSSignInBundleFromSearchParams(params, fallbackReturn, request);
}

/**
 * @param {URL} requestUrl
 * @param {Request} [request]
 */
export async function resolveWorkOSAuthorizeUrlFromGoUrl(requestUrl, request) {
  const { url } = await resolveWorkOSAuthorizeBundleFromGoUrl(requestUrl, request);
  return url;
}

function workOSGoErrorResponse(message, backHref, status = 503) {
  return new Response(workosGoErrorHtml(message, backHref), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * @param {URL} requestUrl
 * @param {Request} [request]
 */
export async function workOSGoJsonResponse(requestUrl, request) {
  const { backHref, params } = workOSGoContext(requestUrl);
  try {
    const bundle = await resolveWorkOSAuthorizeBundleFromGoUrl(requestUrl, request);
    const stateKey = bundle.sealedState ? hashOAuthState(bundle.sealedState) : "";
    const returnTo = String(params.get("returnTo") || "").trim() || "/mobile/access";
    if (stateKey && bundle.url && bundle.sealedState) {
      const saved = await saveOAuthAuthorizePending(stateKey, bundle.url, bundle.sealedState, returnTo);
      if (saved.ok) {
        return NextResponse.json(
          { ok: true, key: stateKey, stateKey },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      console.warn("[torp] WorkOS authorize pending save failed, using inline URL fallback:", saved.reason);
    }
    return NextResponse.json(
      {
        ok: true,
        url: bundle.url,
        stateKey,
        sealedState: bundle.sealedState,
      },
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
 * @param {Request} [request]
 */
export async function workOSGoResponse(requestUrl, request) {
  const { backHref, params } = workOSGoContext(requestUrl);
  try {
    const bundle = await resolveWorkOSAuthorizeBundleFromGoUrl(requestUrl, request);
    const response = workOSAuthRedirectBridge(bundle.url);
    attachWorkOSAuthorizeCookies(
      response,
      bundle.sealedState,
      request ? shouldMarkOAuthNativeShell(params, request) : false,
    );
    return response;
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
