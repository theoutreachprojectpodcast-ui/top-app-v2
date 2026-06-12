/** Custom URL schemes that reopen the installed Capacitor app. */
export const MOBILE_AUTH_DEEP_LINK_SCHEMES = [
  "org.theoutreachproject.torp",
  "theoutreachproject",
];

/** @deprecated Prefer auth/complete deep links; kept for billing return sync. */
export const MOBILE_ACCOUNT_REFRESH_HOST = "account";
export const MOBILE_ACCOUNT_REFRESH_PATH = "refresh";

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
  return `org.theoutreachproject.torp://auth/complete?${params.toString()}`;
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

  if (
    parsed.protocol === "org.theoutreachproject.torp:" ||
    parsed.protocol === "theoutreachproject:"
  ) {
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
  }

  if (raw.includes("account/refresh")) {
    return { kind: "account-refresh" };
  }

  return null;
}
