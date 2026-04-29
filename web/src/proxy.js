import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { updateSession } from "@/utils/supabase/middleware";
import {
  fingerprintFromSessionCookieValue,
  lastActiveCookieName,
  sessionFingerprintCookieName,
  sessionIdleTimeoutMs,
  workosSessionCookieName,
} from "@/lib/auth/sessionIdle";

/**
 * Next.js 16+ uses the `proxy` convention (replaces `middleware`) so AuthKit can attach
 * `x-workos-middleware` / `x-workos-session` for `withAuth()` in Route Handlers.
 * Server Components that cannot rely on those headers should use `getWorkOSUserFromCookies()` instead.
 * @see https://github.com/workos/authkit-nextjs#proxy--middleware
 */
const workosProxy = isWorkOSConfigured() ? authkitProxy() : null;

function secureCookieFlag(request) {
  return request.nextUrl.protocol === "https:";
}

function cookieBaseOptions(request) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookieFlag(request),
    maxAge: 60 * 60 * 24 * 400,
  };
}

export default async function proxy(request) {
  if (!workosProxy) {
    return updateSession(request);
  }

  const idleMs = sessionIdleTimeoutMs();
  const sessionName = workosSessionCookieName();
  const sessionVal = request.cookies.get(sessionName)?.value;
  const hasWorkosSession = Boolean(sessionVal);

  if (idleMs > 0 && hasWorkosSession) {
    const fpNow = fingerprintFromSessionCookieValue(sessionVal);
    const fpCookie = request.cookies.get(sessionFingerprintCookieName())?.value || "";
    const lastRaw = request.cookies.get(lastActiveCookieName())?.value;
    let lastMs = Number(lastRaw);
    if (!Number.isFinite(lastMs) || lastMs <= 0) {
      lastMs = Date.now();
    }
    const rotated = fpCookie !== fpNow;
    if (rotated) {
      lastMs = Date.now();
    }
    if (!rotated && Date.now() - lastMs > idleMs) {
      const url = new URL("/sign-out", request.url);
      url.searchParams.set("returnTo", "/");
      return NextResponse.redirect(url);
    }
  }

  const res = await workosProxy(request);

  if (idleMs > 0 && hasWorkosSession) {
    const fpNow = fingerprintFromSessionCookieValue(sessionVal);
    const opts = cookieBaseOptions(request);
    const now = Date.now();
    res.cookies.set(lastActiveCookieName(), String(now), opts);
    res.cookies.set(sessionFingerprintCookieName(), fpNow, opts);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
