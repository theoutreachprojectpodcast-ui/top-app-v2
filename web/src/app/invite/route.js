import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import {
  getWorkOSAuthKitRedirectUrl,
  readWorkOSInvitationToken,
} from "@/lib/auth/workosAuthorizationRedirect";
import { safeWorkOSReturnTarget } from "@/lib/auth/workosSafeReturn";

/**
 * WorkOS invitation acceptance entry (Redirects → User invitation URL).
 * Default accept URL: `https://your-app.com/invite?invitation_token=…`
 */
export async function GET(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }

  const invitationToken = readWorkOSInvitationToken(request.nextUrl.searchParams);
  if (!invitationToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const returnTo = safeWorkOSReturnTarget(
    request.nextUrl.searchParams.get("returnTo") || "/onboarding",
    "/onboarding",
  );

  try {
    const url = await getWorkOSAuthKitRedirectUrl({
      returnPathname: returnTo,
      screenHint: "sign-up",
      invitationToken,
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "workos_not_configured" }, { status: 503 });
  }
}
