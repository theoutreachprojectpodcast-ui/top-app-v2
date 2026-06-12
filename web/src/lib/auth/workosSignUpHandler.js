import { NextResponse } from "next/server";
import { workOSAuthorizeBridgeFromBundle } from "@/lib/auth/workosAuthorizationRedirect";
import { resolveWorkOSSignUpBundleFromSearchParams } from "@/lib/auth/workosSignUpUrl";

/**
 * WorkOS AuthKit sign-up entry — used by `/sign-up`, `/auth/sign-up`, and `/api/auth/workos/signup`.
 *
 * @param {Request} request
 */
export async function workOSSignUpResponse(request) {
  try {
    const bundle = await resolveWorkOSSignUpBundleFromSearchParams(
      request.nextUrl.searchParams,
      "/onboarding",
      request,
    );
    return workOSAuthorizeBridgeFromBundle(bundle, false);
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
    console.error("[torp] WorkOS sign-up redirect failed:", e);
    return NextResponse.json(
      { error: "workos_signup_failed", message: "Could not start sign-up." },
      { status: 503 },
    );
  }
}
