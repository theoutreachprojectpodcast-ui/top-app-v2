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

export async function GET(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }
  const raw = request.nextUrl.searchParams.get("returnTo");
  const returnTo = safeWorkOSReturnTarget(raw || "/onboarding", "/onboarding");
  const remember = request.nextUrl.searchParams.get("remember");
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(request.nextUrl.searchParams.get("loginHint"));
  const invitationToken = readWorkOSInvitationToken(request.nextUrl.searchParams);

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
