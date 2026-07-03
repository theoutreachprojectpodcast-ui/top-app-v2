import { NextResponse } from "next/server";
import { safeAppReturnPath } from "@/lib/billing/stripeConfig";
import { resolveMobileNativePostLoginPath } from "@/lib/capacitor/mobilePostLoginReturn";
import {
  attachWorkOSSessionCookie,
  consumeMobileSessionTransferToken,
} from "@/lib/auth/mobileSessionTransfer";

export const dynamic = "force-dynamic";

/**
 * Exchange a one-time mobile auth transfer token for a WorkOS session cookie in the Capacitor WebView.
 */
export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");
  const requestedReturn = request.nextUrl.searchParams.get("returnTo");
  const payload = await consumeMobileSessionTransferToken(String(token || ""));
  if (!payload) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 });
  }

  const returnTo = resolveMobileNativePostLoginPath(
    safeAppReturnPath(requestedReturn || payload.returnTo, "/"),
  );
  const response = NextResponse.json({ ok: true, returnTo });
  attachWorkOSSessionCookie(response, payload.cookieValue);
  return response;
}
