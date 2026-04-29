import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  fingerprintFromSessionCookieValue,
  lastActiveCookieName,
  sessionFingerprintCookieName,
  sessionIdleTimeoutMs,
  workosSessionCookieName,
} from "@/lib/auth/sessionIdle";

export const runtime = "nodejs";

/**
 * Sliding idle clock: bump last-activity for authenticated WorkOS sessions.
 * Called occasionally from the client on pointer activity (throttled).
 */
export async function POST(request) {
  if (sessionIdleTimeoutMs() <= 0) {
    return NextResponse.json({ ok: true, idle: "off" });
  }
  const jar = await cookies();
  const sessionVal = jar.get(workosSessionCookieName())?.value;
  if (!sessionVal) {
    return new NextResponse(null, { status: 204 });
  }
  const fp = fingerprintFromSessionCookieValue(sessionVal);
  const secure = request.nextUrl.protocol === "https:";
  const opts = { path: "/", httpOnly: true, sameSite: "lax", secure };
  const now = Date.now();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(lastActiveCookieName(), String(now), opts);
  res.cookies.set(sessionFingerprintCookieName(), fp, opts);
  return res;
}
