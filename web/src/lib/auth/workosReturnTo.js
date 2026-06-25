import { safeAppReturnPath } from "@/lib/billing/stripeConfig";
import { workosGoUrl } from "@/lib/auth/workosGoUrl";
import { isAuthEntryReturnPath, sanitizeAuthReturnPath } from "@/lib/auth/authReturnPath";

/** Native post-OAuth destination — use `/` (patched to `/?oauth=1` on callback). */
export const MOBILE_POST_AUTH_COMPLETE_PATH = "/";
/**
 * Build a safe same-origin return path for WorkOS sign-in (current route, without auth-overlay query flags).
 * @param {string} [pathname]
 * @param {{ toString?: () => string } | null} [searchParams] next/navigation useSearchParams()
 */
export function workosReturnPathFromRouter(pathname, searchParams) {
  const next = new URLSearchParams(typeof searchParams?.toString === "function" ? searchParams.toString() : "");
  next.delete("signin");
  next.delete("signup");
  const q = next.toString();
  const path = typeof pathname === "string" && pathname.startsWith("/") ? pathname : "/";
  if (isAuthEntryReturnPath(path)) return "/";
  const combined = `${path}${q ? `?${q}` : ""}`;
  return sanitizeAuthReturnPath(safeAppReturnPath(combined, "/"), "/");
}

/**
 * @typedef {{ rememberDevice?: boolean, loginHint?: string }} WorkOSSignInLinkOptions
 */

/**
 * @param {string} [pathname]
 * @param {{ toString?: () => string } | null} [searchParams]
 * @param {string} [fallback]
 * @param {WorkOSSignInLinkOptions} [options]
 */
export function workosSignInLink(pathname, searchParams, fallback = "/", options = {}) {
  const returnTo = workosReturnPathFromRouter(pathname, searchParams) || fallback;
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  const rememberDevice = options.rememberDevice !== false;
  params.set("remember", rememberDevice ? "1" : "0");
  const hint = String(options.loginHint || "").trim();
  if (hint) params.set("loginHint", hint);
  return `/sign-in?${params.toString()}`;
}

/**
 * Mobile WebView launcher pages (fetch JSON authorize URL — no route-handler navigation).
 * @param {string} returnTo
 * @param {WorkOSSignInLinkOptions} [options]
 */
export function workosMobileSignInHref(returnTo = MOBILE_POST_AUTH_COMPLETE_PATH, options = {}) {
  return workosGoUrl({
    mode: "signin",
    returnTo: returnTo || MOBILE_POST_AUTH_COMPLETE_PATH,
    rememberDevice: options.rememberDevice,
    loginHint: options.loginHint,
    native: true,
  });
}

/** @param {string} returnTo @param {WorkOSSignInLinkOptions} [options] */
export function workosMobileSignUpHref(returnTo = "/mobile/access", options = {}) {
  return workosGoUrl({
    mode: "signup",
    returnTo: returnTo || "/mobile/access",
    rememberDevice: options.rememberDevice,
    loginHint: options.loginHint,
    native: true,
  });
}

/**
 * Sign-up URL with optional email hint for AuthKit (does not store credentials).
 * @param {string} returnTo — safe path (e.g. /access)
 * @param {{ rememberDevice?: boolean, loginHint?: string }} [options]
 */
export function workosSignUpHref(returnTo, options = {}) {
  const safe = safeAppReturnPath(returnTo, "/access");
  const params = new URLSearchParams();
  params.set("returnTo", safe);
  const rememberDevice = options.rememberDevice !== false;
  params.set("remember", rememberDevice ? "1" : "0");
  const hint = String(options.loginHint || "").trim();
  if (hint) params.set("loginHint", hint);
  return `/sign-up?${params.toString()}`;
}
