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

/** Public app origin (apex), no trailing slash. */
export function appPublicBaseUrl() {
  return appBaseUrl().replace(/\/$/, "");
}

/** Absolute URL on the public app host (not the admin subdomain). */
export function appPublicHref(path = "/") {
  const p = String(path || "/").trim();
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${appPublicBaseUrl()}${normalized}`;
}

/** e.g. www.theoutreachproject.app when apex is theoutreachproject.app */
export function wwwHostnameForApex() {
  const apex = apexHostnameFromEnv();
  return apex ? `www.${apex}` : "";
}

/**
 * Admin UI hostname from NEXT_PUBLIC_ADMIN_URL, or `admin.{apex}` when apex is configured.
 */
export function adminHostnameFromEnv() {
  const raw = String(process.env.NEXT_PUBLIC_ADMIN_URL || "").trim();
  if (raw) {
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      return u.hostname.toLowerCase();
    } catch {
      return "";
    }
  }
  const apex = apexHostnameFromEnv();
  return apex ? `admin.${apex}` : "";
}

/**
 * Admin console origin (no trailing slash).
 * Falls back to public app URL when no separate admin host is configured.
 */
export function adminBaseUrl() {
  const raw = String(process.env.NEXT_PUBLIC_ADMIN_URL || "").trim();
  if (raw) {
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      return u.origin;
    } catch {
      /* fall through */
    }
  }
  const host = adminHostnameFromEnv();
  const apex = apexHostnameFromEnv();
  if (host && apex && host !== apex) {
    try {
      const app = new URL(appBaseUrl());
      return `${app.protocol}//${host}`;
    } catch {
      return appPublicBaseUrl();
    }
  }
  return appPublicBaseUrl();
}

/** True when admin runs on a dedicated hostname (not only /admin on apex). */
export function hasDedicatedAdminHost() {
  return adminBaseUrl().replace(/\/$/, "") !== appPublicBaseUrl();
}

/**
 * Link target for “Admin console” from the public app.
 * Uses admin subdomain when configured; otherwise `/admin` on apex.
 */
export function adminConsoleHref(path = "/") {
  const p = String(path || "/").trim();
  const normalized = p.startsWith("/") ? p : `/${p}`;
  if (!hasDedicatedAdminHost()) {
    return normalized.startsWith("/admin") ? normalized : `/admin${normalized === "/" ? "" : normalized}`;
  }
  if (normalized.startsWith("/admin")) {
    const tail = normalized.slice("/admin".length) || "";
    return `${adminBaseUrl()}${tail}`;
  }
  return `${adminBaseUrl()}${normalized === "/" ? "" : normalized}`;
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
 * On admin host, rewrite bare paths to /admin… (API, Next internals, auth entrypoints stay untouched).
 * @param {string} pathname request.nextUrl.pathname
 */
export function shouldRewriteAdminSubdomainPath(pathname) {
  const p = pathname || "/";
  if (p.startsWith("/api")) return false;
  if (p.startsWith("/_next")) return false;
  if (p.startsWith("/auth")) return false;
  if (p === "/callback" || p.startsWith("/callback?")) return false;
  if (p === "/invite" || p.startsWith("/invite?")) return false;
  if (p === "/login" || p.startsWith("/login?")) return false;
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
