/** sessionStorage keys for Capacitor Browser OAuth return (SFSafariViewController → WKWebView). */
export const TORP_OAUTH_STATE_KEY = "torp-oauth-state-key";
export const TORP_OAUTH_BROWSER_PENDING = "torp-oauth-browser-pending";
export const TORP_OAUTH_RETURN_KEY = "torp-oauth-return";

/** Set by `/auth/workos-native-browser` / `/auth/workos-browser-start` for WebView polling. */
export const TORP_OAUTH_POLL_KEY_COOKIE = "torp-oauth-poll-key";

import { MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";

/** Default post-login destination in the native shell. */
export const MOBILE_POST_AUTH_HOME = MOBILE_POST_LOGIN_PATH;

/** @returns {string} */
export function readOAuthPollKeyFromDocumentCookie() {
  if (typeof document === "undefined") return "";
  const name = TORP_OAUTH_POLL_KEY_COOKIE;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/** Drop stale poll-key cookie so a finished OAuth flow cannot re-arm sessionStorage. */
export function clearOAuthPollKeyCookie() {
  if (typeof document === "undefined") return;
  const name = TORP_OAUTH_POLL_KEY_COOKIE;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
