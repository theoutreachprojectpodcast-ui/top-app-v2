import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
import { safeWorkOSReturnTarget } from "@/lib/auth/workosSafeReturn";
import { workOSAuthKitAuthorizeOptions } from "@/lib/auth/workosOrganizationScope";

export async function GET(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }
  const raw = request.nextUrl.searchParams.get("returnTo") || "/";
  const returnTo = safeWorkOSReturnTarget(raw, "/");
  const remember = request.nextUrl.searchParams.get("remember");
  /** When user declines “stay signed in”, ask IdP for a fresh login when supported (OIDC prompt=login). */
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(request.nextUrl.searchParams.get("loginHint"));
  const url = await getSignInUrl({ returnTo, loginHint, prompt, ...workOSAuthKitAuthorizeOptions() });
  return NextResponse.redirect(url);
}
