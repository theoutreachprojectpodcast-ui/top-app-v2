import { MOBILE_OAUTH_HOME_PATH, MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

/** Append `oauth=1` so `MobileOAuthSessionResume` refreshes session after native OAuth. */
export function withMobileOAuthReturnFlag(pathAndQuery) {
  const raw = String(pathAndQuery || "/").trim() || "/";
  if (/[?&]oauth=1(?:&|$)/.test(raw)) return raw;
  const q = raw.indexOf("?");
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const params = new URLSearchParams(q === -1 ? "" : raw.slice(q + 1));
  params.set("oauth", "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : `${pathname}?oauth=1`;
}

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
  let resolved = path;
  if (path.startsWith("/onboarding")) resolved = path;
  else if (path.startsWith("/mobile/access") || path.startsWith("/access")) resolved = path;
  else if (path === MOBILE_POST_LOGIN_PATH || path.startsWith("/mobile/auth/complete")) {
    resolved = MOBILE_OAUTH_HOME_PATH;
  } else if (path.startsWith("/mobile")) resolved = path;
  else resolved = MOBILE_OAUTH_HOME_PATH;
  return withMobileOAuthReturnFlag(resolved);
}
