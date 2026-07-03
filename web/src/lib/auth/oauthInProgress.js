import { TOP_OAUTH_BROWSER_PENDING } from "@/lib/auth/oauthMobileHandoff";
import { isInMobileOAuthResumeGrace } from "@/lib/auth/mobileOAuthReturn";

/** True only during legacy in-app browser handoff (not same-WebView OAuth). */
export function isOAuthInProgress() {
  if (typeof sessionStorage === "undefined") return false;
  if (isInMobileOAuthResumeGrace()) return false;
  return sessionStorage.getItem(TOP_OAUTH_BROWSER_PENDING) === "1";
}
