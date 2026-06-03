import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
import { safeWorkOSReturnTarget } from "@/lib/auth/workosSafeReturn";
import {
  getWorkOSAuthKitRedirectUrl,
  readWorkOSInvitationToken,
} from "@/lib/auth/workosAuthorizationRedirect";
import { workOSAuthKitAuthorizeOptions } from "@/lib/auth/workosOrganizationScope";

function readReturnTo(searchParams, fallback = "/onboarding") {
  const raw =
    searchParams.get("returnTo") ||
    searchParams.get("return_pathname") ||
    searchParams.get("returnPathname") ||
    "";
  return safeWorkOSReturnTarget(raw || fallback, fallback);
}

/**
 * WorkOS AuthKit sign-up entry — used by `/sign-up`, `/auth/sign-up`, and `/api/auth/workos/signup`.
 *
 * @param {Request} request
 */
export async function workOSSignUpResponse(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const returnTo = readReturnTo(searchParams, "/onboarding");
  const remember = searchParams.get("remember");
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(searchParams.get("loginHint"));
  const invitationToken = readWorkOSInvitationToken(searchParams);

  if (invitationToken) {
    try {
      const url = await getWorkOSAuthKitRedirectUrl({
        returnPathname: returnTo,
        screenHint: "sign-up",
        loginHint,
        prompt,
        invitationToken,
      });
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.json({ error: "workos_not_configured" }, { status: 503 });
    }
  }

  const url = await getSignUpUrl({
    returnTo,
    loginHint,
    prompt,
    ...workOSAuthKitAuthorizeOptions({ signUp: true }),
  });
  return NextResponse.redirect(url);
}
