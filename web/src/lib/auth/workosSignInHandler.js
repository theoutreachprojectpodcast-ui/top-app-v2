import { NextResponse } from "next/server";
import { workOSAuthRedirectBridge } from "@/lib/auth/workosAuthRedirectBridge";
import { attachWorkOSAuthorizeCookies } from "@/lib/auth/workosAuthorizationRedirect";
import { shouldMarkOAuthNativeShell } from "@/lib/auth/workosOAuthShell";
import { resolveWorkOSSignInBundleFromSearchParams } from "@/lib/auth/workosSignInUrl";

/**
 * WorkOS AuthKit sign-in entry — used by `/sign-in`, `/login`, and `/api/auth/workos/signin`.
 * Configure **Redirects → Sign-in endpoint** in WorkOS to `https://theoutreachproject.app/sign-in`.
 *
 * @param {Request} request
 */
export async function workOSSignInResponse(request) {
  try {
    const params = request.nextUrl.searchParams;
    const bundle = await resolveWorkOSSignInBundleFromSearchParams(params, "/", request);
    const response = workOSAuthRedirectBridge(bundle.url);
    attachWorkOSAuthorizeCookies(
      response,
      bundle.sealedState,
      shouldMarkOAuthNativeShell(params, request),
    );
    return response;
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
