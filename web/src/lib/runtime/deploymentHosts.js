import { appBaseUrl } from "@/lib/billing/stripeConfig";

/**
 * Apex hostname from NEXT_PUBLIC_APP_URL / APP_BASE_URL (no www, no port in prod).
 * Empty when localhost — www redirect and admin host matching are skipped.
 */
export function apexHostnameFromEnv() {
  try {
    const u = new URL(appBaseUrl());
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return "";
    return h;
  } catch {
    return "";
  }
}

/** e.g. www.theoutreachproject.app when apex is theoutreachproject.app */
export function wwwHostnameForApex() {
  const apex = apexHostnameFromEnv();
  return apex ? `www.${apex}` : "";
}

/**
 * Admin UI hostname from NEXT_PUBLIC_ADMIN_URL (e.g. https://admin.theoutreachproject.app).
 */
export function adminHostnameFromEnv() {
  const raw = String(process.env.NEXT_PUBLIC_ADMIN_URL || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** @param {string} host lowercased, no port */
export function shouldRedirectWwwToApex(host) {
  const h = String(host || "").toLowerCase();
  const www = wwwHostnameForApex();
  return !!www && h === www;
}

/** @param {string} host */
export function isAdminHostname(host) {
  const h = String(host || "").toLowerCase();
  const admin = adminHostnameFromEnv();
  return !!admin && h === admin;
}

/**
 * On admin host, rewrite bare paths to /admin… (API, Next internals, sign-out stay untouched).
 * @param {string} pathname request.nextUrl.pathname
 */
export function shouldRewriteAdminSubdomainPath(pathname) {
  const p = pathname || "/";
  if (p.startsWith("/api")) return false;
  if (p.startsWith("/_next")) return false;
  if (p === "/callback" || p.startsWith("/callback?")) return false;
  if (p === "/sign-out" || p.startsWith("/sign-out?")) return false;
  if (p.startsWith("/admin")) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(p.split("/").pop() || "")) return false;
  return true;
}

/**
 * Domain attribute for app-managed cookies that must align with WorkOS session scope.
 * Use the same value as WORKOS_COOKIE_DOMAIN (no leading dot).
 */
export function sharedSessionCookieDomain() {
  const d = String(process.env.WORKOS_COOKIE_DOMAIN || process.env.TOP_SHARED_COOKIE_DOMAIN || "").trim();
  if (!d) return undefined;
  return d.replace(/^\./, "");
}
