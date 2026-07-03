import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import { decodeJwt } from "jose";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { clearAdminEmailSessionCookie } from "@/lib/auth/adminEmailSession";
import { safeWorkOSReturnTarget } from "@/lib/auth/workosSafeReturn";
import {
  lastActiveCookieName,
  sessionFingerprintCookieName,
  workosSessionCookieName,
} from "@/lib/auth/sessionIdle";
import { appPublicHref, sharedSessionCookieDomain } from "@/lib/runtime/deploymentHosts";

/**
 * AuthKit `signOut()` calls `redirect()` and must not be used in Route Handlers.
 * Build a NextResponse that clears session cookies and redirects to WorkOS logout (or home).
 *
 * @param {string} [rawReturnTo] path or URL from query param
 */
export async function buildWorkOSSignOutResponse(rawReturnTo = "/") {
  const path = safeWorkOSReturnTarget(String(rawReturnTo || "/").trim(), "/");
  const returnToAbsolute = path.startsWith("http") ? path : appPublicHref(path);

  const sessionId = await readWorkOSSessionIdFromCookies();

  let destination = returnToAbsolute;
  if (sessionId) {
    try {
      destination = getWorkOS().userManagement.getLogoutUrl({
        sessionId,
        returnTo: returnToAbsolute,
      });
    } catch {
      destination = returnToAbsolute;
    }
  }

  const res = NextResponse.redirect(destination);
  clearSessionCookies(res);
  clearAdminEmailSessionCookie(res);
  return res;
}

/** @returns {Promise<string | null>} */
async function readWorkOSSessionIdFromCookies() {
  const password = String(process.env.WORKOS_COOKIE_PASSWORD || "");
  if (password.length < 32) return null;

  try {
    const jar = await cookies();
    const raw = jar.get(workosSessionCookieName());
    if (!raw?.value) return null;
    const session = await unsealData(raw.value, { password });
    if (!session?.accessToken) return null;
    const claims = decodeJwt(session.accessToken);
    return claims?.sid ? String(claims.sid) : null;
  } catch {
    return null;
  }
}

/** Match AuthKit cookie flags so logout actually clears the session the login flow sets. */
function sessionCookieClearOptions() {
  const domain = sharedSessionCookieDomain();
  const redirectUri = String(
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "",
  ).trim();
  let secure = process.env.NODE_ENV === "production";
  try {
    if (redirectUri) secure = new URL(redirectUri).protocol === "https:";
  } catch {
    /* keep default */
  }
  const sameSiteRaw = String(process.env.WORKOS_COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(sameSiteRaw) ? sameSiteRaw : "lax";
  return {
    path: "/",
    httpOnly: true,
    sameSite,
    secure: sameSite === "none" ? true : secure,
    maxAge: 0,
    ...(domain ? { domain } : {}),
  };
}

/** @param {import("next/server").NextResponse} res */
function clearSessionCookies(res) {
  const opts = sessionCookieClearOptions();
  const names = [
    workosSessionCookieName(),
    lastActiveCookieName(),
    sessionFingerprintCookieName(),
    "workos-access-token",
    "wos-auth-verifier",
  ];
  for (const name of names) {
    res.cookies.set(name, "", opts);
  }
}
