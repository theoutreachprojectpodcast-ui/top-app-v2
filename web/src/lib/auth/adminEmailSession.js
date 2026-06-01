import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { sharedSessionCookieDomain } from "@/lib/runtime/deploymentHosts";
import { adminEmailSessionPassword, isAdminEmailLoginEnabled } from "@/lib/auth/adminEmailLogin";

export const ADMIN_EMAIL_SESSION_COOKIE = "top-admin-email-session";

/** @deprecated use ADMIN_EMAIL_SESSION_COOKIE */
export const QA_DEMO_ADMIN_COOKIE_NAME = ADMIN_EMAIL_SESSION_COOKIE;

const MAX_AGE_SEC = 60 * 60 * 12;

function cookieBaseOptions() {
  const domain = sharedSessionCookieDomain();
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

/**
 * @param {string} email
 * @returns {Promise<string | null>}
 */
export async function sealAdminEmailSession(email) {
  const password = adminEmailSessionPassword();
  const normalized = String(email || "").trim().toLowerCase();
  if (!password || !normalized) return null;
  return sealData({ email: normalized, v: 1, issuedAt: Date.now() }, { password, ttl: MAX_AGE_SEC });
}

/**
 * @returns {Promise<{ email: string } | null>}
 */
export async function readAdminEmailSessionFromCookies() {
  if (!isAdminEmailLoginEnabled()) return null;
  const password = adminEmailSessionPassword();
  try {
    const jar = await cookies();
    const raw =
      jar.get(ADMIN_EMAIL_SESSION_COOKIE) ||
      jar.get("top-qa-admin-session");
    if (!raw?.value) return null;
    const data = await unsealData(raw.value, { password, ttl: MAX_AGE_SEC });
    const email = String(data?.email || "").trim().toLowerCase();
    if (!email || !isDefaultApprovedAdminEmail(email)) return null;
    return { email };
  } catch {
    return null;
  }
}

/**
 * @param {Response} response
 * @param {string} sealed
 */
export function applyAdminEmailSessionCookie(response, sealed) {
  response.cookies.set(ADMIN_EMAIL_SESSION_COOKIE, sealed, {
    ...cookieBaseOptions(),
    maxAge: MAX_AGE_SEC,
  });
  response.cookies.set("top-qa-admin-session", "", { ...cookieBaseOptions(), maxAge: 0 });
  return response;
}

/** @param {Response} response */
export function clearAdminEmailSessionCookie(response) {
  response.cookies.set(ADMIN_EMAIL_SESSION_COOKIE, "", {
    ...cookieBaseOptions(),
    maxAge: 0,
  });
  response.cookies.set("top-qa-admin-session", "", {
    ...cookieBaseOptions(),
    maxAge: 0,
  });
  return response;
}

/**
 * @param {string} email
 */
export function adminEmailSyntheticUser(email) {
  const em = String(email || "").trim().toLowerCase();
  return {
    id: `admin-email:${em}`,
    email: em,
    firstName: "Admin",
    lastName: "",
    emailVerified: true,
    profilePictureUrl: null,
    createdAt: "",
    updatedAt: "",
  };
}
