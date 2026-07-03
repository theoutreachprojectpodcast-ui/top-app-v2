import { NextResponse } from "next/server";
import { unsealOAuthBridge } from "@/lib/auth/oauthMobileHandoffServer";

/**
 * GET — document navigation fallback: unseal code/state and forward into WebView `/callback`.
 */
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("t");
  const payload = await unsealOAuthBridge(token || "");
  if (!payload) {
    return NextResponse.redirect(new URL("/sign-in?oauth_error=Sign-in%20expired", request.url), 302);
  }

  const dest = new URL("/callback", request.url);
  dest.searchParams.set("code", payload.code);
  dest.searchParams.set("state", payload.state);
  const res = NextResponse.redirect(dest, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
