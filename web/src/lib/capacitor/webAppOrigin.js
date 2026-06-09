import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";

const PRODUCTION_ORIGIN = "https://theoutreachproject.app";
const QA_ORIGIN = "https://qa.theoutreachproject.app";

/**
 * Canonical web-app origin for external-browser account flows.
 * In the Capacitor WebView, `window.location.origin` matches the loaded deploy (prod or QA).
 */
export function getWebAppOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, "");
  }
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (isQaDeploymentContext()) return QA_ORIGIN;
  return PRODUCTION_ORIGIN;
}

/** Deep link opened by return pages to bring the user back into the native shell. */
export const MOBILE_APP_DEEP_LINK = "org.theoutreachproject.torp://account/refresh";

/** Query flag appended to web return URLs after external signup / billing. */
export const MOBILE_RETURN_QUERY = "mobileReturn=account";

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
