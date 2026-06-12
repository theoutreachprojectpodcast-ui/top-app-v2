import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";
import {
  getWorkOSAuthKitAuthorizeBundle,
  readWorkOSInvitationToken,
} from "@/lib/auth/workosAuthorizationRedirect";
import {
  isAdminReturnPath,
  isBootstrapAdminWorkOSSignIn,
  workOSAuthKitAuthorizeOptions,
} from "@/lib/auth/workosOrganizationScope";
import { shouldMarkOAuthNativeShell } from "@/lib/auth/workosOAuthShell";
function readReturnTo(searchParams, fallback = "/") {
  const raw =
    searchParams.get("returnTo") ||
    searchParams.get("return_pathname") ||
    searchParams.get("returnPathname") ||
    "";
  return resolvePostAuthReturnTarget(raw || fallback, fallback);
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} [fallbackReturn="/"]
 * @param {Request} [request]
 * @returns {Promise<{ url: string, sealedState: string }>}
 */
export async function resolveWorkOSSignInBundleFromSearchParams(
  searchParams,
  fallbackReturn = "/",
  request,
) {
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

  return getWorkOSAuthKitAuthorizeBundle({
    returnPathname: returnTo,
    screenHint: "sign-in",
    loginHint,
    prompt,
    invitationToken: invitationToken || undefined,
    organizationId: orgOptions.organizationId,
    markNativeShell: shouldMarkOAuthNativeShell(searchParams, request),
  });
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} [fallbackReturn="/"]
 * @param {Request} [request]
 * @returns {Promise<string>}
 */
export async function resolveWorkOSSignInFromSearchParams(searchParams, fallbackReturn = "/", request) {
  const { url } = await resolveWorkOSSignInBundleFromSearchParams(searchParams, fallbackReturn, request);
  return url;
}

/**
 * @param {Request} request
 * @returns {Promise<string>}
 */
export async function resolveWorkOSSignInUrl(request) {
  return resolveWorkOSSignInFromSearchParams(request.nextUrl.searchParams, "/", request);
}
