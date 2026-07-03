/** sessionStorage keys for Capacitor Browser OAuth return (SFSafariViewController → WKWebView). */
export const TOP_OAUTH_STATE_KEY = "top-oauth-state-key";
export const TOP_OAUTH_BROWSER_PENDING = "top-oauth-browser-pending";
export const TOP_OAUTH_RETURN_KEY = "top-oauth-return";
/** Set when in-app browser handoff times out — surfaced on next route. */
export const TOP_OAUTH_HANDOFF_ERROR = "top-oauth-handoff-error";

/** Set by `/auth/workos-native-browser` / `/auth/workos-browser-start` for WebView polling. */
export const TOP_OAUTH_POLL_KEY_COOKIE = "top-oauth-poll-key";

/** Durable poll key if sessionStorage is cleared while the in-app browser is open. */
export const TOP_OAUTH_STATE_LOCAL_KEY = "top-oauth-state-key-local";

/** sessionStorage — suppress OAuth handoff overlays while session/profile hydrate after return. */
export const TOP_OAUTH_RESUME_GRACE_KEY = "top-oauth-resume-grace-until";

import { MOBILE_OAUTH_HOME_PATH } from "@/lib/runtime/appUrls";

/** Default post-login destination in the native shell. */
export const MOBILE_POST_AUTH_HOME = MOBILE_OAUTH_HOME_PATH;

/** @returns {string} */
export function readOAuthPollKeyFromDocumentCookie() {
  if (typeof document === "undefined") return "";
  const name = TOP_OAUTH_POLL_KEY_COOKIE;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/** Drop stale poll-key cookie so a finished OAuth flow cannot re-arm sessionStorage. */
export function clearOAuthPollKeyCookie() {
  if (typeof document === "undefined") return;
  const name = TOP_OAUTH_POLL_KEY_COOKIE;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
