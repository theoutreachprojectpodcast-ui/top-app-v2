/** Primary native URL scheme (matches iOS Info.plist + Capacitor appId). */
export const NATIVE_APP_URL_SCHEME = "com.theoutreachproject.theoutreachproject";

/** Custom URL schemes that reopen the installed Capacitor app. */
export const MOBILE_AUTH_DEEP_LINK_SCHEMES = [
  NATIVE_APP_URL_SCHEME,
  "theoutreachproject",
  "org.theoutreachproject.torp",
];

/** @deprecated Prefer auth/complete deep links; kept for billing return sync. */
export const MOBILE_ACCOUNT_REFRESH_HOST = "account";
export const MOBILE_ACCOUNT_REFRESH_PATH = "refresh";

function isNativeAppDeepLinkProtocol(protocol) {
  const p = String(protocol || "").toLowerCase();
  return MOBILE_AUTH_DEEP_LINK_SCHEMES.some((scheme) => p === `${scheme}:`);
}

/**
 * Build a deep link that returns auth session into the native app WebView.
 * @param {string} transferToken sealed one-time session transfer token
 * @param {string} [returnTo]
 */
export function buildMobileAuthCompleteDeepLink(transferToken, returnTo = "/") {
  const params = new URLSearchParams();
  params.set("token", String(transferToken || "").trim());
  const safeReturn = String(returnTo || "/").trim() || "/";
  if (safeReturn !== "/") params.set("returnTo", safeReturn);
  return `${NATIVE_APP_URL_SCHEME}://auth/complete?${params.toString()}`;
}

/**
 * Universal-link fallback when Safari cannot open a custom scheme (opens app → WebView).
 * @param {string} transferToken
 * @param {string} [returnTo]
 * @param {string} origin e.g. https://theoutreachproject.app
 */
export function buildMobileAuthCompleteUniversalLink(transferToken, returnTo = "/", origin = "") {
  const params = new URLSearchParams();
  params.set("token", String(transferToken || "").trim());
  const safeReturn = String(returnTo || "/").trim() || "/";
  if (safeReturn !== "/") params.set("returnTo", safeReturn);
  const base = String(origin || "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/mobile-auth/complete?${params.toString()}`;
}

/**
 * Universal-link fallback after in-app browser OAuth (applies session cookies in the WebView).
 * @param {string} stateKey
 * @param {string} origin
 */
export function buildOAuthHandoffCompleteUniversalLink(stateKey, origin = "") {
  const key = String(stateKey || "").trim();
  const base = String(origin || "").replace(/\/$/, "");
  if (!key || !base) return "";
  return `${base}/api/mobile/oauth-handoff/complete?key=${encodeURIComponent(key)}`;
}

/**
 * @param {string} url
 * @returns {{ kind: "auth-complete", token: string, returnTo: string } | { kind: "account-refresh" } | null}
 */
export function parseMobileDeepLinkUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = `${parsed.pathname || ""}`.replace(/^\/+/, "");

  if (isNativeAppDeepLinkProtocol(parsed.protocol)) {
    if (host === "auth" && (path === "complete" || path.startsWith("complete"))) {
      const token = String(parsed.searchParams.get("token") || "").trim();
      if (!token) return null;
      return {
        kind: "auth-complete",
        token,
        returnTo: String(parsed.searchParams.get("returnTo") || "/").trim() || "/",
      };
    }
    if (host === MOBILE_ACCOUNT_REFRESH_HOST && path === MOBILE_ACCOUNT_REFRESH_PATH) {
      return { kind: "account-refresh" };
    }
  }

  if (parsed.protocol === "https:" || parsed.protocol === "http:") {
    if (path === "mobile/auth/complete" || path.endsWith("/mobile/auth/complete")) {
      return { kind: "auth-complete-web" };
    }
    if (path === "mobile-auth/complete" || path.endsWith("/mobile-auth/complete")) {
      const token = String(parsed.searchParams.get("token") || "").trim();
      if (token) {
        return {
          kind: "auth-complete",
          token,
          returnTo: String(parsed.searchParams.get("returnTo") || "/").trim() || "/",
        };
      }
    }
    if (path === "mobile-auth/callback" || path.endsWith("/mobile-auth/callback")) {
      return { kind: "auth-callback-web" };
    }
    if (path === "api/mobile/oauth-handoff/complete" || path.endsWith("/api/mobile/oauth-handoff/complete")) {
      const key = String(parsed.searchParams.get("key") || "").trim();
      if (key) return { kind: "oauth-handoff-complete", key };
    }
  }

  if (raw.includes("account/refresh")) {
    return { kind: "account-refresh" };
  }

  return null;
}
