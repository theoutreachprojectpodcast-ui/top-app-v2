import { NextResponse } from "next/server";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
import { readWorkOSInvitationToken, attachWorkOSAuthorizeCookies } from "@/lib/auth/workosAuthorizationRedirect";
import { resolveWorkOSSignInBundleFromSearchParams } from "@/lib/auth/workosSignInUrl";
import {
  isAdminReturnPath,
  isBootstrapAdminWorkOSSignIn,
  workOSAuthKitAuthorizeOptions,
} from "@/lib/auth/workosOrganizationScope";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";

function readReturnTo(searchParams) {
  const raw =
    searchParams.get("returnTo") ||
    searchParams.get("return_pathname") ||
    searchParams.get("returnPathname") ||
    "/";
  return resolvePostAuthReturnTarget(raw, "/");
}

/**
 * WorkOS AuthKit sign-in entry — used by `/sign-in`, `/login`, and `/api/auth/workos/signin`.
 * Configure **Redirects → Sign-in endpoint** in WorkOS to `https://theoutreachproject.app/sign-in`.
 *
 * @param {Request} request
 */
export async function workOSSignInResponse(request) {
  try {
    const params = request.nextUrl.searchParams;
    const returnTo = readReturnTo(params);
    const loginHint = sanitizeWorkOSLoginHint(params.get("loginHint"));
    const prompt = params.get("remember") === "0" ? "login" : undefined;
    const invitationToken = readWorkOSInvitationToken(params);
    const orgOptions = workOSAuthKitAuthorizeOptions({
      loginHint,
      bootstrap: isBootstrapAdminWorkOSSignIn(params) || isAdminReturnPath(returnTo),
      adminReturn: isAdminReturnPath(returnTo),
      invitation: Boolean(invitationToken),
    });

    if (invitationToken) {
      const bundle = await resolveWorkOSSignInBundleFromSearchParams(params, "/", request);
      const response = workOSAuthRedirectBridge(bundle.url);
      attachWorkOSAuthorizeCookies(response, bundle.sealedState, false);
      return response;
    }

    const url = await getSignInUrl({ returnTo, loginHint, prompt, ...orgOptions });
    return workOSAuthRedirectBridge(url);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "authentication_not_configured") {
      return NextResponse.json(
        { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
        { status: 503 },
      );
    }
    if (message === "workos_not_configured") {
      return NextResponse.json({ error: "workos_not_configured" }, { status: 503 });
    }
    console.error("[torp] WorkOS getSignInUrl failed:", e);
    return NextResponse.json(
      { error: "workos_signin_failed", message: "Could not start sign-in. Check WorkOS env and redirect URIs." },
      { status: 503 },
    );
  }
}
