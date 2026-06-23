import { cookies } from "next/headers";

/** Marks OAuth started inside the Capacitor shell (WKWebView UA often lacks "Capacitor"). */
export const TOP_OAUTH_SHELL_COOKIE = "top-oauth-shell";
export const TOP_OAUTH_SHELL_NATIVE = "native";

function oauthShellCookieOptions() {
  const domain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  return {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    ...(domain ? { domain } : {}),
  };
}

/** Route handler — commit shell marker via next/headers (reliable with AuthKit PKCE cookies). */
export async function markOAuthNativeShell() {
  const jar = await cookies();
  jar.set(TOP_OAUTH_SHELL_COOKIE, TOP_OAUTH_SHELL_NATIVE, oauthShellCookieOptions());
}

/** @param {string} [cookieDomain] */
export function oauthShellSetCookieHeader(cookieDomain) {
  const domain = String(cookieDomain || process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  const domainPart = domain ? `; Domain=${domain}` : "";
  return `${TOP_OAUTH_SHELL_COOKIE}=${TOP_OAUTH_SHELL_NATIVE}; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Lax${domainPart}`;
}

/** @param {string} [cookieDomain] */
export function oauthShellClearCookieHeader(cookieDomain) {
  const domain = String(cookieDomain || process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  const domainPart = domain ? `; Domain=${domain}` : "";
  return `${TOP_OAUTH_SHELL_COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax${domainPart}`;
}

/** Route handler — clear shell marker after successful callback. */
export async function clearOAuthNativeShell() {
  const jar = await cookies();
  jar.set(TOP_OAUTH_SHELL_COOKIE, "", { ...oauthShellCookieOptions(), maxAge: 0 });
}

/** @param {Request} request */
export function isNativeWorkOSShellRequest(request) {
  const ua = String(request?.headers?.get("user-agent") || "");
  if (ua.includes("Capacitor") || ua.includes("TheOutreachProject/Capacitor")) return true;
  return request?.cookies?.get(TOP_OAUTH_SHELL_COOKIE)?.value === TOP_OAUTH_SHELL_NATIVE;
}

/** @param {Request} request */
export function oauthStartedInNativeShell(request) {
  return isNativeWorkOSShellRequest(request);
}

/**
 * @param {URLSearchParams} searchParams
 * @param {Request} [request]
 */
export function shouldMarkOAuthNativeShell(searchParams, request) {
  if (isNativeWorkOSShellRequest(request)) return true;
  if (String(searchParams.get("native") || "") === "1") return true;
  const returnTo = String(searchParams.get("returnTo") || "");
  return returnTo.startsWith("/mobile") || returnTo.includes("nav=") || returnTo.startsWith("/community");
}

