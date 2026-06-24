import { nativeProductionAppOrigin } from "@/lib/capacitor/webAppOrigin";
import { MOBILE_OAUTH_HOME_PATH, MOBILE_POST_LOGIN_PATH } from "@/lib/runtime/appUrls";
import {
  clearOAuthPollKeyCookie,
  TOP_OAUTH_BROWSER_PENDING,
  TOP_OAUTH_RETURN_KEY,
  TOP_OAUTH_STATE_KEY,
} from "@/lib/auth/oauthMobileHandoff";

export function isMobileOAuthReturnSearch(search = "") {
  const raw = String(search || "").trim();
  const qs = raw.startsWith("?") ? raw.slice(1) : raw;
  return new URLSearchParams(qs).get("oauth") === "1";
}

export function isMobileOAuthReturnUrl(href) {
  if (typeof href !== "string" || !href) return false;
  try {
    const u = new URL(href, typeof window !== "undefined" ? window.location.origin : "https://theoutreachproject.app");
    return u.searchParams.get("oauth") === "1";
  } catch {
    return isMobileOAuthReturnSearch(href);
  }
}

/** Clear Capacitor OAuth handoff flags so overlays and gates do not block the app shell. */
export function clearMobileOAuthHandoffState() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(TOP_OAUTH_BROWSER_PENDING);
  sessionStorage.removeItem(TOP_OAUTH_STATE_KEY);
  sessionStorage.removeItem(TOP_OAUTH_RETURN_KEY);
  clearOAuthPollKeyCookie();
}

/**
 * Hard navigation into the logged-in app home (Capacitor-safe; avoids RSC redirect stalls).
 * @param {string} [path]
 */
export function navigateToMobileAppHomeAfterOAuth(path = MOBILE_OAUTH_HOME_PATH) {
  clearMobileOAuthHandoffState();
  if (typeof window === "undefined") return;
  const dest = String(path || MOBILE_OAUTH_HOME_PATH).trim() || MOBILE_OAUTH_HOME_PATH;
  const url = dest.startsWith("http") ? dest : `${nativeProductionAppOrigin()}${dest.startsWith("/") ? dest : `/${dest}`}`;
  window.location.replace(url);
}

export function isMobileAuthCompletePath(pathname) {
  const p = String(pathname || "").trim() || "/";
  return p === MOBILE_POST_LOGIN_PATH || p === "/mobile/auth/complete";
}
