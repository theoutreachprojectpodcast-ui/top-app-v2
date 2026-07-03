/**
 * Canonical URL configuration — single source for web, auth, API, and mobile origins.
 * Import from here; do not hardcode production hostnames in components or routes.
 */
import { isQaDeploymentContext } from "@/lib/runtime/qaDeploymentContext";

export const PRODUCTION_APEX_HOST = "theoutreachproject.app";
export const PRODUCTION_ORIGIN = `https://${PRODUCTION_APEX_HOST}`;
export const PRODUCTION_WWW_HOST = `www.${PRODUCTION_APEX_HOST}`;
export const QA_ORIGIN = "https://qa.theoutreachproject.app";

/** Marketing typo domain — not registered; used for user-facing error copy only. */
export const INVALID_ALTERNATE_DOMAIN = "outreachproject.app";

/**
 * @returns {"local" | "qa" | "production" | "preview"}
 */
export function deploymentProfile() {
  const vercelEnv = String(process.env.VERCEL_ENV || "").toLowerCase();
  if (vercelEnv === "preview") return "preview";
  if (isQaDeploymentContext()) return "qa";
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").toLowerCase();
  if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) return "local";
  if (appUrl.includes("qa.") || appUrl.includes("-git-qa")) return "qa";
  return "production";
}

/** Public web origin (no trailing slash). */
export function webBaseUrl() {
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = String(window.location.origin).replace(/\/$/, "");
    if (!isLocalShellOrigin(origin)) return origin;
  }
  if (deploymentProfile() === "qa") return QA_ORIGIN;
  return PRODUCTION_ORIGIN;
}

function isLocalShellOrigin(origin) {
  try {
    const u = new URL(String(origin || ""));
    const host = (u.hostname || "").toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1") return true;
    return u.protocol === "capacitor:" || u.protocol === "ionic:" || u.protocol === "file:";
  } catch {
    return true;
  }
}

/** Capacitor `server.url` — production web root (`/`). */
export function mobileWebEntryUrl() {
  const base = webBaseUrl().replace(/\/mobile\/?$/, "");
  return base;
}

export function authCallbackPath() {
  return "/callback";
}

export function authCallbackUrl() {
  const explicit = String(
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || process.env.WORKOS_REDIRECT_URI || "",
  ).trim();
  if (explicit) {
    const cleaned = explicit.replace(/\/$/, "");
    return cleaned.includes("/callback") ? cleaned : `${cleaned}/callback`;
  }
  return `${webBaseUrl()}${authCallbackPath()}`;
}

export const MOBILE_AUTH_START_PATH = "/mobile/auth/start";
export const MOBILE_AUTH_CALLBACK_PATH = "/mobile/auth/callback";
export const MOBILE_POST_LOGIN_PATH = "/mobile/auth/complete";
export const MOBILE_OAUTH_HOME_PATH = "/?oauth=1";
export const MOBILE_HOME_PATH = "/mobile/home";

/** @param {string} path */
export function absoluteAppUrl(path) {
  const p = String(path || "/").trim();
  const normalized = p.startsWith("/") ? p : `/${p}`;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  return `${webBaseUrl()}${normalized}`;
}

/** Allowed CORS / redirect origins for production (documentation + validation). */
export function allowedProductionOrigins() {
  return [PRODUCTION_ORIGIN, `https://${PRODUCTION_WWW_HOST}`, QA_ORIGIN];
}

/** @returns {string[]} Safe env issues for health endpoints (no secret values). */
export function productionUrlEnvIssues() {
  const issues = [];
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim();
  if (!appUrl) issues.push("APP_BASE_URL or NEXT_PUBLIC_APP_URL unset");
  else if (appUrl.includes("localhost") && deploymentProfile() === "production") {
    issues.push("APP_BASE_URL points at localhost in production");
  }
  if (appUrl.includes(INVALID_ALTERNATE_DOMAIN) && !appUrl.includes(PRODUCTION_APEX_HOST)) {
    issues.push(`APP_BASE_URL uses invalid domain ${INVALID_ALTERNATE_DOMAIN} — use ${PRODUCTION_APEX_HOST}`);
  }
  const redirect = authCallbackUrl();
  if (deploymentProfile() === "production" && !redirect.includes(PRODUCTION_APEX_HOST)) {
    issues.push("WORKOS redirect URI does not use production apex host");
  }
  return issues;
}
