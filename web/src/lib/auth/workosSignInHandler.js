import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
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
 * WorkOS AuthKit sign-in entry — used by `/sign-in`, `/login`, and `/api/auth/workos/signin`.
 * Configure **Redirects → Sign-in endpoint** in WorkOS to `https://theoutreachproject.app/sign-in`.
 *
 * @param {Request} request
 */
export async function workOSSignInResponse(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const returnTo = readReturnTo(searchParams, "/");
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

  if (invitationToken) {
    try {
      const url = await getWorkOSAuthKitRedirectUrl({
        returnPathname: returnTo,
        screenHint: "sign-in",
        loginHint,
        prompt,
        invitationToken,
        organizationId: orgOptions.organizationId,
      });
      return workOSAuthRedirectBridge(url);
    } catch {
      return NextResponse.json({ error: "workos_not_configured" }, { status: 503 });
    }
  }

  try {
    const url = await getSignInUrl({
      returnTo,
      loginHint,
      prompt,
      ...orgOptions,
    });
    return workOSAuthRedirectBridge(url);
  } catch (e) {
    console.error("[torp] WorkOS getSignInUrl failed:", e);
    return NextResponse.json(
      { error: "workos_signin_failed", message: "Could not start sign-in. Check WorkOS env and redirect URIs." },
      { status: 503 },
    );
  }
}
