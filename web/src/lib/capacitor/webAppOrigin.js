import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";

export const PRODUCTION_ORIGIN = "https://theoutreachproject.app";
const QA_ORIGIN = "https://qa.theoutreachproject.app";

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
  }
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (isQaDeploymentContext()) return QA_ORIGIN;
  return PRODUCTION_ORIGIN;
}

/** Native Capacitor WebView entry — splash + auth gate (not full TopApp home). */
export const MOBILE_NATIVE_ENTRY_PATH = "/mobile";

/**
 * Capacitor `server.url` — load mobile splash first to avoid TopApp loading on `/`.
 * @param {string} origin e.g. https://theoutreachproject.app
 */
export function capacitorServerUrl(origin) {
  const base = String(origin || "").trim().replace(/\/$/, "");
  if (!base) return MOBILE_NATIVE_ENTRY_PATH;
  if (base.endsWith(MOBILE_NATIVE_ENTRY_PATH)) return base;
  return `${base}${MOBILE_NATIVE_ENTRY_PATH}`;
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
