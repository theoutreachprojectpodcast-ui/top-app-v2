import {
  TORP_OAUTH_BROWSER_PENDING,
  TORP_OAUTH_STATE_KEY,
  TORP_OAUTH_RETURN_KEY,
} from "@/lib/auth/oauthMobileHandoff";

/** True while native OAuth browser handoff is in flight (skip duplicate boot overlays). */
export function isOAuthInProgress() {
  if (typeof sessionStorage === "undefined") return false;
  return (
    sessionStorage.getItem(TORP_OAUTH_BROWSER_PENDING) === "1" ||
    !!sessionStorage.getItem(TORP_OAUTH_STATE_KEY) ||
    sessionStorage.getItem(TORP_OAUTH_RETURN_KEY) === "1"
  );
}
