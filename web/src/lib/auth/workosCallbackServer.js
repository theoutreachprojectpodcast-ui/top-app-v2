import { MOBILE_OAUTH_HOME_PATH } from "@/lib/runtime/appUrls";
import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

function isCapacitorUserAgent(ua) {
  const agent = String(ua || "");
  return agent.includes("Capacitor") || agent.includes("TheOutreachProject/Capacitor");
}

/**
 * @param {string} returnPathname
 * @param {string} userAgent
 * @param {boolean} [startedInNativeShell]
 */
export function resolveMobileAppPostAuthPath(returnPathname, userAgent, startedInNativeShell = false) {
  const path = String(returnPathname || "").trim() || "/";
  const inApp = isCapacitorUserAgent(userAgent) || startedInNativeShell;
  if (!inApp) return path;
  if (path.startsWith("/onboarding")) return path;
  if (path.startsWith("/mobile/access") || path.startsWith("/access")) return path;
  if (path === MOBILE_POST_LOGIN_PATH || path.startsWith("/mobile/auth/complete")) {
    return MOBILE_OAUTH_HOME_PATH;
  }
  if (path.startsWith("/mobile")) return path;
  return MOBILE_OAUTH_HOME_PATH;
}
