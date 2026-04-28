import { safeAppReturnPath } from "@/lib/billing/stripeConfig";

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
  const combined = `${path}${q ? `?${q}` : ""}`;
  return safeAppReturnPath(combined, "/");
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
  return `/api/auth/workos/signin?${params.toString()}`;
}

/**
 * Sign-up URL with optional email hint for AuthKit (does not store credentials).
 * @param {string} returnTo — safe path (e.g. /onboarding)
 * @param {{ rememberDevice?: boolean, loginHint?: string }} [options]
 */
export function workosSignUpHref(returnTo, options = {}) {
  const safe = safeAppReturnPath(returnTo, "/onboarding");
  const params = new URLSearchParams();
  params.set("returnTo", safe);
  const rememberDevice = options.rememberDevice !== false;
  params.set("remember", rememberDevice ? "1" : "0");
  const hint = String(options.loginHint || "").trim();
  if (hint) params.set("loginHint", hint);
  return `/api/auth/workos/signup?${params.toString()}`;
}
