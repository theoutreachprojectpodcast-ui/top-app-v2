import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";
import {
  MOBILE_POST_LOGIN_PATH,
  PRODUCTION_ORIGIN,
  QA_ORIGIN,
  webBaseUrl,
} from "@/lib/runtime/appUrls";

export { PRODUCTION_ORIGIN, MOBILE_POST_LOGIN_PATH as MOBILE_NATIVE_ENTRY_PATH };

/** Production/QA origin for native OAuth API calls — never `https://localhost`. */
export function nativeProductionAppOrigin() {
  if (isQaDeploymentContext()) return QA_ORIGIN;
  return PRODUCTION_ORIGIN;
}

function isLocalCapacitorShellOrigin(origin) {
  try {
    const u = new URL(String(origin || ""));
    const host = (u.hostname || "").toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1") return true;
    return u.protocol === "capacitor:";
  } catch {
    return true;
  }
}

/**
 * Canonical web-app origin for external-browser account flows.
 * In the Capacitor WebView, `window.location.origin` matches the loaded deploy (prod or QA).
 * Falls back when the native shell still points at `localhost` (missing `server.url` at archive time).
 */
export function getWebAppOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = String(window.location.origin).replace(/\/$/, "");
    if (!isLocalCapacitorShellOrigin(origin)) {
      return origin;
    }
    // Stale capacitor://localhost shell — always production (never QA/preview).
    return PRODUCTION_ORIGIN;
  }
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (isQaDeploymentContext()) return QA_ORIGIN;
  return PRODUCTION_ORIGIN;
}

/**
 * Capacitor `server.url` — production web origin (no `/mobile` suffix).
 * @param {string} origin e.g. https://theoutreachproject.app
 */
export function capacitorServerUrl(origin) {
  const base = String(origin || "").trim().replace(/\/$/, "");
  if (!base) return PRODUCTION_ORIGIN;
  return base.replace(/\/mobile\/?$/, "");
}


/** Query flag appended to web return URLs after external signup / billing. */
export const MOBILE_RETURN_QUERY = "mobileReturn=account";

/** Deep link opened by return pages to bring the user back into the native shell. */
export const MOBILE_APP_DEEP_LINK = "com.theoutreachproject.theoutreachproject://account/refresh";

/**
 * @param {string} path
 * @param {Record<string, string | undefined>} [extraParams]
 */
export function webAppPathWithMobileReturn(path, extraParams = {}) {
  const base = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();
  params.set("mobileReturn", "account");
  for (const [key, value] of Object.entries(extraParams)) {
    if (value != null && String(value).trim()) params.set(key, String(value).trim());
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/**
 * @param {string} path
 * @param {Record<string, string | undefined>} [extraParams]
 */
export function absoluteWebAppUrl(path, extraParams) {
  const normalized = webAppPathWithMobileReturn(path, extraParams);
  return `${getWebAppOrigin()}${normalized}`;
}

/**
 * Absolute same-app URL for auth/API fetches in Capacitor (avoids `https://localhost/...` when
 * the native shell lacks `server.url` or WKWebView origin is still local).
 * @param {string} path
 */
export function appUrl(path) {
  const p = String(path || "").trim() || "/";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${getWebAppOrigin()}${normalized}`;
}
