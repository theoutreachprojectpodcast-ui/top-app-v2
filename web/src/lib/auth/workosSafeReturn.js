import { appBaseUrl } from "@/lib/billing/stripeConfig";
import { adminBaseUrl, adminHostnameFromEnv, hasDedicatedAdminHost } from "@/lib/runtime/deploymentHosts";
import { sanitizeAuthReturnPath } from "@/lib/auth/authReturnPath";

/**
 * WorkOS `returnTo` after hosted auth: same-origin path, or absolute URL only when it targets
 * this app’s apex or the configured admin subdomain (cross-subdomain login).
 * @param {string} raw
 * @param {string} fallback path starting with /
 */
export function safeWorkOSReturnTarget(raw, fallback = "/") {
  const f = String(fallback || "/").trim().startsWith("/") ? String(fallback || "/").trim() : "/";
  const s = String(raw || "").trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (!s.startsWith("http")) return f;
  try {
    const u = new URL(s);
    const app = new URL(appBaseUrl());
    if (u.origin === app.origin) {
      const out = `${u.pathname}${u.search}` || "/";
      return out.startsWith("/") ? out : f;
    }
    const adminHost = adminHostnameFromEnv();
    if (adminHost && u.hostname.toLowerCase() === adminHost) {
      if (u.pathname.startsWith("/admin")) {
        return `${u.pathname}${u.search}`;
      }
      const inner = u.pathname === "/" || u.pathname === "" ? "/admin" : `/admin${u.pathname}`;
      return `${inner}${u.search}`;
    }
  } catch {
    // fall through
  }
  return f;
}

/**
 * Post-auth destination for WorkOS sign-in (path on apex, or absolute admin URL when on a separate host).
 * @param {string} raw
 * @param {string} fallback
 */
export function resolvePostAuthReturnTarget(raw, fallback = "/") {
  const path = sanitizeAuthReturnPath(safeWorkOSReturnTarget(raw, fallback), fallback);
  if (path.startsWith("http")) return path;
  if (!hasDedicatedAdminHost() || !path.startsWith("/admin")) {
    return path;
  }
  const tail = path.slice("/admin".length);
  return `${adminBaseUrl()}${tail}`;
}
