import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { workOSAuthorizeBridgeFromBundle } from "@/lib/auth/workosAuthorizationRedirect";
import { resolveWorkOSSignInBundleFromSearchParams } from "@/lib/auth/workosSignInUrl";

/**
 * WorkOS AuthKit sign-in entry — used by `/login`, `/sign-in`, and API aliases.
 * Redirects to hosted AuthKit (does not chain through intermediate routes).
 *
 * @param {import("next/server").NextRequest} request
 */
export async function respondWorkOSSignIn(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const bundle = await resolveWorkOSSignInBundleFromSearchParams(request.nextUrl.searchParams, "/", request);
    return workOSAuthorizeBridgeFromBundle(bundle, false);
  } catch {
    return NextResponse.json({ error: "workos_not_configured" }, { status: 503 });
  }
}
