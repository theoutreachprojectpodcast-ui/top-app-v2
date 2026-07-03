import { safeAppReturnPath } from "@/lib/billing/stripeConfig";
import { sanitizeAuthReturnPath } from "@/lib/auth/authReturnPath";

/**
 * One-step WorkOS handoff — GET `/auth/workos-go` returns HTML that commits PKCE then redirects.
 * Works in Capacitor WKWebView (no `/api/*` navigation, no server-action cookies).
 *
 * @param {{ mode?: "signin" | "signup", returnTo?: string, rememberDevice?: boolean, loginHint?: string, native?: boolean }} [options]
 */
export function workosGoUrl(options = {}) {
  const mode = options.mode === "signup" ? "signup" : "signin";
  const defaultReturn = mode === "signup" ? "/access" : "/";
  const returnTo = sanitizeAuthReturnPath(
    safeAppReturnPath(options.returnTo || defaultReturn, defaultReturn),
    defaultReturn,
  );
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("returnTo", returnTo);
  params.set("remember", options.rememberDevice === false ? "0" : "1");
  if (options.native) params.set("native", "1");
  const hint = String(options.loginHint || "").trim();
  if (hint) params.set("loginHint", hint);
  return `/auth/workos-go?${params.toString()}`;
}
