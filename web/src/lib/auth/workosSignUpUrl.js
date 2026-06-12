import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
import { safeWorkOSReturnTarget } from "@/lib/auth/workosSafeReturn";
import {
  getWorkOSAuthKitAuthorizeBundle,
  readWorkOSInvitationToken,
} from "@/lib/auth/workosAuthorizationRedirect";
import { workOSAuthKitAuthorizeOptions } from "@/lib/auth/workosOrganizationScope";
import { shouldMarkOAuthNativeShell } from "@/lib/auth/workosOAuthShell";
function readReturnTo(searchParams, fallback = "/onboarding") {
  const raw =
    searchParams.get("returnTo") ||
    searchParams.get("return_pathname") ||
    searchParams.get("returnPathname") ||
    "";
  return safeWorkOSReturnTarget(raw || fallback, fallback);
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} [fallbackReturn="/onboarding"]
 * @param {Request} [request]
 * @returns {Promise<{ url: string, sealedState: string }>}
 */
export async function resolveWorkOSSignUpBundleFromSearchParams(
  searchParams,
  fallbackReturn = "/onboarding",
  request,
) {
  if (!isWorkOSConfigured()) {
    throw new Error("authentication_not_configured");
  }

  const returnTo = readReturnTo(searchParams, fallbackReturn);
  const remember = searchParams.get("remember");
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(searchParams.get("loginHint"));
  const invitationToken = readWorkOSInvitationToken(searchParams);
  const orgOptions = workOSAuthKitAuthorizeOptions({ signUp: true });

  return getWorkOSAuthKitAuthorizeBundle({
    returnPathname: returnTo,
    screenHint: "sign-up",
    loginHint,
    prompt,
    invitationToken: invitationToken || undefined,
    organizationId: orgOptions.organizationId,
    markNativeShell: shouldMarkOAuthNativeShell(searchParams, request),
  });
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} [fallbackReturn="/onboarding"]
 * @returns {Promise<string>}
 */
export async function resolveWorkOSSignUpFromSearchParams(searchParams, fallbackReturn = "/onboarding", request) {
  const { url } = await resolveWorkOSSignUpBundleFromSearchParams(searchParams, fallbackReturn, request);
  return url;
}

/**
 * @param {Request} request
 * @returns {Promise<string>}
 */
export async function resolveWorkOSSignUpUrl(request) {
  return resolveWorkOSSignUpFromSearchParams(request.nextUrl.searchParams, "/onboarding", request);
}
