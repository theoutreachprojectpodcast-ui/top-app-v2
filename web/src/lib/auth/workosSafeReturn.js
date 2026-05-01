import { appBaseUrl } from "@/lib/billing/stripeConfig";
import { adminHostnameFromEnv } from "@/lib/runtime/deploymentHosts";

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
