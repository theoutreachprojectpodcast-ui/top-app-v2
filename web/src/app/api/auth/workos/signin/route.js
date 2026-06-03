import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
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

export async function GET(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }
  const raw = request.nextUrl.searchParams.get("returnTo") || "/";
  const returnTo = resolvePostAuthReturnTarget(raw, "/");
  const remember = request.nextUrl.searchParams.get("remember");
  /** When user declines “stay signed in”, ask IdP for a fresh login when supported (OIDC prompt=login). */
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(request.nextUrl.searchParams.get("loginHint"));
  const bootstrap = isBootstrapAdminWorkOSSignIn(request.nextUrl.searchParams) || isAdminReturnPath(returnTo);
  const invitationToken = readWorkOSInvitationToken(request.nextUrl.searchParams);
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
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.json({ error: "workos_not_configured" }, { status: 503 });
    }
  }

  const url = await getSignInUrl({
    returnTo,
    loginHint,
    prompt,
    ...orgOptions,
  });
  return NextResponse.redirect(url);
}
