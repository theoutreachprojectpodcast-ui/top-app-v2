import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Mobile-friendly OAuth callback alias — forwards to canonical `/callback` (same WebView session).
 */
export async function GET(request) {
  const url = new URL(request.url);
  const dest = new URL("/callback", url.origin);
  url.searchParams.forEach((value, key) => {
    dest.searchParams.set(key, value);
  });
  return NextResponse.redirect(dest, { status: 302, headers: { "Cache-Control": "no-store" } });
}
