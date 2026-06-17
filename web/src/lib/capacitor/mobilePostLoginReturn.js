import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

/**
 * Capacitor WebView landing after OAuth / session handoff — funnel through
 * `/mobile/auth/complete` so session + entitlements hydrate before home.
 * @param {string} [raw]
 */
export function resolveMobileNativePostLoginPath(raw) {
  const p = String(raw || "").trim();
  if (p.startsWith("/onboarding")) return p;
  if (p.startsWith("/mobile/auth/complete")) return p;
  return MOBILE_POST_LOGIN_PATH;
}
