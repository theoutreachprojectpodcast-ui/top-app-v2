import { NextResponse } from "next/server";
import { hashOAuthState, peekOAuthMobileHandoff } from "@/lib/auth/oauthMobileHandoffServer";

/**
 * GET — WebView polls by short `key` (sha256 of OAuth state) until in-app browser finishes OAuth.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const stateKey = String(url.searchParams.get("key") || "").trim();
  const legacyState = String(url.searchParams.get("state") || "").trim();

  let key = stateKey;
  if (!key && legacyState) {
    key = hashOAuthState(legacyState);
  }

  if (!key) {
    return NextResponse.json(
      { ok: false, message: "Missing sign-in key." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const pending = await peekOAuthMobileHandoff(key);
  if (!pending) {
    return NextResponse.json(
      { ok: false, message: "Sign-in not ready yet." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (pending.kind === "session") {
    return NextResponse.json(
      {
        ok: true,
        kind: "session",
        complete: `/api/mobile/oauth-handoff/complete?key=${encodeURIComponent(key)}`,
        redirectTo: pending.redirectTo,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const out = {
    ok: true,
    kind: "oauth",
    code: pending.code,
    state: pending.state,
    redirectTo: pending.redirectTo,
  };
  if (pending.bridgeToken) {
    out.bridge = `/api/mobile/oauth-handoff/bridge?t=${encodeURIComponent(pending.bridgeToken)}`;
  }

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
