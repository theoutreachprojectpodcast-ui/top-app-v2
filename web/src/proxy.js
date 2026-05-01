import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { updateSession } from "@/utils/supabase/middleware";
import {
  fingerprintFromSessionCookieValue,
  lastActiveCookieName,
  sessionFingerprintCookieName,
  sessionIdleTimeoutMs,
  workosSessionCookieName,
} from "@/lib/auth/sessionIdle";
import {
  apexHostnameFromEnv,
  isAdminHostname,
  sharedSessionCookieDomain,
  shouldRedirectWwwToApex,
  shouldRewriteAdminSubdomainPath,
} from "@/lib/runtime/deploymentHosts";

/**
 * Next.js 16+ uses the `proxy` convention (replaces `middleware`) so AuthKit can attach
 * `x-workos-middleware` / `x-workos-session` for `withAuth()` in Route Handlers.
 * Server Components that cannot rely on those headers should use `getWorkOSUserFromCookies()` instead.
 * @see https://github.com/workos/authkit-nextjs#proxy--middleware
 */
const workosProxy = isWorkOSConfigured() ? authkitProxy() : null;

function requestHost(request) {
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = (forwarded ? forwarded.split(",")[0] : request.headers.get("host")) || "";
  return String(raw).trim().split(":")[0].toLowerCase();
}

function secureCookieFlag(request) {
  return request.nextUrl.protocol === "https:";
}

function cookieBaseOptions(request) {
  const domain = sharedSessionCookieDomain();
  const opts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookieFlag(request),
    maxAge: 60 * 60 * 24 * 400,
  };
  if (domain) opts.domain = domain;
  return opts;
}

function redirectWwwToApex(request) {
  const apex = apexHostnameFromEnv();
  if (!apex) return null;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const dest = new URL(request.nextUrl.pathname + request.nextUrl.search, `${proto}://${apex}`);
  return NextResponse.redirect(dest, 301);
}

function rewriteAdminSubdomainRequest(request, host) {
  if (!isAdminHostname(host)) return null;
  const pathname = request.nextUrl.pathname || "/";
  if (!shouldRewriteAdminSubdomainPath(pathname)) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
  return new NextRequest(url, request);
}

export default async function proxy(request) {
  const host = requestHost(request);

  if (shouldRedirectWwwToApex(host)) {
    const redir = redirectWwwToApex(request);
    if (redir) return redir;
  }

  const rewritten = rewriteAdminSubdomainRequest(request, host);
  const incoming = rewritten || request;

  if (!workosProxy) {
    return updateSession(incoming);
  }

  const idleMs = sessionIdleTimeoutMs();
  const sessionName = workosSessionCookieName();
  const sessionVal = incoming.cookies.get(sessionName)?.value;
  const hasWorkosSession = Boolean(sessionVal);

  if (idleMs > 0 && hasWorkosSession) {
    const fpNow = fingerprintFromSessionCookieValue(sessionVal);
    const fpCookie = incoming.cookies.get(sessionFingerprintCookieName())?.value || "";
    const lastRaw = incoming.cookies.get(lastActiveCookieName())?.value;
    let lastMs = Number(lastRaw);
    if (!Number.isFinite(lastMs) || lastMs <= 0) {
      lastMs = Date.now();
    }
    const rotated = fpCookie !== fpNow;
    if (rotated) {
      lastMs = Date.now();
    }
    if (!rotated && Date.now() - lastMs > idleMs) {
      const url = new URL("/sign-out", incoming.url);
      url.searchParams.set("returnTo", "/");
      return NextResponse.redirect(url);
    }
  }

  const res = await workosProxy(incoming);

  if (idleMs > 0 && hasWorkosSession) {
    const fpNow = fingerprintFromSessionCookieValue(sessionVal);
    const opts = cookieBaseOptions(incoming);
    const now = Date.now();
    res.cookies.set(lastActiveCookieName(), String(now), opts);
    res.cookies.set(sessionFingerprintCookieName(), fpNow, opts);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
