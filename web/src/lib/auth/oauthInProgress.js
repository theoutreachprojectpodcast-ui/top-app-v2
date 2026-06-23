import { TOP_OAUTH_BROWSER_PENDING } from "@/lib/auth/oauthMobileHandoff";

/** True while the Capacitor in-app OAuth browser is open (not post-return session resume). */
export function isOAuthInProgress() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(TOP_OAUTH_BROWSER_PENDING) === "1";
}
