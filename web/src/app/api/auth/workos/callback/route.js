import { NextResponse } from "next/server";
import { runWorkOSCallback } from "@/lib/auth/workosCallbackHandler";

export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * WorkOS OAuth code exchange — used by `/callback` page fetch (Capacitor-safe).
 * Register redirect URI: https://theoutreachproject.app/callback
 */
export async function GET(request) {
  try {
    return await runWorkOSCallback(request);
  } catch (err) {
    console.error("[top] WorkOS callback route failed:", err);
    const message = err instanceof Error ? err.message : "Could not complete sign in.";
    if (request.headers.get("x-top-callback-fetch") === "1") {
      return NextResponse.json(
        { ok: false, error: "workos_callback_failed", message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json({ error: "workos_callback_failed", message }, { status: 500 });
  }
}
