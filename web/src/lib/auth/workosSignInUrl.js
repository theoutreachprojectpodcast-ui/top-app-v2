import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";
import {
  getWorkOSAuthKitRedirectUrl,
  readWorkOSInvitationToken,
} from "@/lib/auth/workosAuthorizationRedirect";
import {
  isAdminReturnPath,
  isBootstrapAdminWorkOSSignIn,
  workOSAuthKitAuthorizeOptions,
} from "@/lib/auth/workosOrganizationScope";
function readReturnTo(searchParams, fallback = "/") {
  const raw =
    searchParams.get("returnTo") ||
    searchParams.get("return_pathname") ||
    searchParams.get("returnPathname") ||
    "";
  return resolvePostAuthReturnTarget(raw || fallback, fallback);
}

/**
 * Resolve WorkOS AuthKit authorize URL and mint PKCE cookie (via next/headers cookies()).
 * @param {URLSearchParams} searchParams
 * @param {string} [fallbackReturn="/"]
 * @returns {Promise<string>}
 */
export async function resolveWorkOSSignInFromSearchParams(searchParams, fallbackReturn = "/") {
  if (!isWorkOSConfigured()) {
    throw new Error("authentication_not_configured");
  }

  const returnTo = readReturnTo(searchParams, fallbackReturn);
  const remember = searchParams.get("remember");
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(searchParams.get("loginHint"));
  const bootstrap = isBootstrapAdminWorkOSSignIn(searchParams) || isAdminReturnPath(returnTo);
  const invitationToken = readWorkOSInvitationToken(searchParams);
  const orgOptions = workOSAuthKitAuthorizeOptions({
    loginHint,
    bootstrap,
    adminReturn: isAdminReturnPath(returnTo),
    invitation: Boolean(invitationToken),
  });

  return getWorkOSAuthKitRedirectUrl({
    returnPathname: returnTo,
    screenHint: "sign-in",
    loginHint,
    prompt,
    invitationToken: invitationToken || undefined,
    organizationId: orgOptions.organizationId,
    markNativeShell:
      returnTo.startsWith("/mobile") || returnTo.includes("nav=") || returnTo.startsWith("/community"),
  });
}

/**
 * @param {Request} request
 * @returns {Promise<string>}
 */
export async function resolveWorkOSSignInUrl(request) {
  return resolveWorkOSSignInFromSearchParams(request.nextUrl.searchParams, "/");
}
