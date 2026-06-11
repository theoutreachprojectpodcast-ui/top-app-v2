import { NextResponse } from "next/server";
import { resolveWorkOSSignUpUrl } from "@/lib/auth/workosSignUpUrl";

/** JSON sign-up URL for Capacitor / mobile WebView (fetch + redirect — avoids 0 KB download prompts). */
export async function GET(request) {
  try {
    const url = await resolveWorkOSSignUpUrl(request);
    return NextResponse.json(
      { url },
      { headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "authentication_not_configured" || message === "workos_not_configured") {
      return NextResponse.json(
        { error: message, message: "WorkOS AuthKit is not configured yet." },
        { status: 503 },
      );
    }
    console.error("[torp] WorkOS signup-url failed:", e);
    return NextResponse.json(
      { error: "workos_signup_failed", message: "Could not start sign-up." },
      { status: 503 },
    );
  }
}
