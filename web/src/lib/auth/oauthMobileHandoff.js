/** sessionStorage keys for Capacitor Browser OAuth return (SFSafariViewController → WKWebView). */
export const TORP_OAUTH_STATE_KEY = "torp-oauth-state-key";
export const TORP_OAUTH_BROWSER_PENDING = "torp-oauth-browser-pending";

/** Set by `/auth/workos-native-browser` / `/auth/workos-browser-start` for WebView polling. */
export const TORP_OAUTH_POLL_KEY_COOKIE = "torp-oauth-poll-key";

/** Default post-login destination in the native shell. */
export const MOBILE_POST_AUTH_HOME = "/";

/** @returns {string} */
export function readOAuthPollKeyFromDocumentCookie() {
  if (typeof document === "undefined") return "";
  const name = TORP_OAUTH_POLL_KEY_COOKIE;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}
