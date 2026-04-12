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
 * @param {string} [pathname]
 * @param {{ toString?: () => string } | null} [searchParams]
 * @param {string} [fallback]
 */
export function workosSignInLink(pathname, searchParams, fallback = "/") {
  const returnTo = workosReturnPathFromRouter(pathname, searchParams) || fallback;
  return `/api/auth/workos/signin?returnTo=${encodeURIComponent(returnTo)}`;
}
