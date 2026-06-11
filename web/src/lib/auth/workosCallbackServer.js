function isCapacitorUserAgent(ua) {
  return String(ua || "").includes("Capacitor");
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
  return "/";
}
