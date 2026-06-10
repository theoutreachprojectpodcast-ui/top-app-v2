import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";

const TRANSFER_TTL_SEC = 120;

function transferPassword() {
  const password = String(process.env.WORKOS_COOKIE_PASSWORD || "");
  if (password.length < 32) {
    throw new Error("workos_cookie_password_missing");
  }
  return password;
}

function workOSSessionCookieName() {
  return String(process.env.WORKOS_COOKIE_NAME || "wos-session").trim() || "wos-session";
}

/** @returns {import("next/dist/compiled/@edge-runtime/cookies").ResponseCookie["options"]} */
export function workOSSessionCookieOptions() {
  const domain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim() || undefined;
  const redirectUri = String(
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "",
  ).trim();
  let secure = true;
  try {
    if (redirectUri) secure = new URL(redirectUri).protocol === "https:";
  } catch {
    secure = true;
  }
  const sameSiteRaw = String(process.env.WORKOS_COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(sameSiteRaw) ? sameSiteRaw : "lax";
  return {
    path: "/",
    httpOnly: true,
    secure: sameSite === "none" ? true : secure,
    sameSite: sameSite === "strict" ? "lax" : sameSite,
    maxAge: 60 * 60 * 24 * 30,
    ...(domain ? { domain } : {}),
  };
}

/**
 * Seal the active WorkOS session cookie for one-time transfer into the Capacitor WebView.
 * @param {string} returnTo safe in-app path
 */
export async function createMobileSessionTransferToken(returnTo = "/") {
  const jar = await cookies();
  const raw = jar.get(workOSSessionCookieName());
  if (!raw?.value) {
    return null;
  }
  const token = await sealData(
    {
      v: 1,
      cookieValue: raw.value,
      returnTo: String(returnTo || "/").trim() || "/",
      exp: Date.now() + TRANSFER_TTL_SEC * 1000,
      nonce: crypto.randomUUID(),
    },
    { password: transferPassword(), ttl: TRANSFER_TTL_SEC },
  );
  return token;
}

/**
 * @param {string} token
 * @returns {Promise<{ cookieValue: string, returnTo: string } | null>}
 */
export async function consumeMobileSessionTransferToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  try {
    const payload = await unsealData(raw, { password: transferPassword() });
    if (!payload?.cookieValue || typeof payload.cookieValue !== "string") return null;
    if (payload.exp && Date.now() > Number(payload.exp)) return null;
    return {
      cookieValue: payload.cookieValue,
      returnTo: String(payload.returnTo || "/").trim() || "/",
    };
  } catch {
    return null;
  }
}

/**
 * @param {import("next/server").NextResponse} response
 * @param {string} cookieValue
 */
export function attachWorkOSSessionCookie(response, cookieValue) {
  response.cookies.set(workOSSessionCookieName(), cookieValue, workOSSessionCookieOptions());
}
