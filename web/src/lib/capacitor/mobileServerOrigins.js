import serverUrls from "../../../capacitor.server-urls.json";

/** Canonical production origin embedded in TestFlight / App Store Capacitor builds. */
export const MOBILE_PRODUCTION_SERVER_ORIGIN = String(serverUrls.production || "https://theoutreachproject.app")
  .trim()
  .replace(/\/$/, "");

/** QA native builds (explicit `mobile:prep:qa` only). */
export const MOBILE_QA_SERVER_ORIGIN = String(serverUrls.qa || "https://qa.theoutreachproject.app")
  .trim()
  .replace(/\/$/, "");

const DEV_HOST_MARKERS = ["localhost", "127.0.0.1", "10.0.2.2", "192.168.", "0.0.0.0"];

/**
 * @param {string} url
 */
export function isDevCapacitorServerUrl(url) {
  const raw = String(url || "").trim().toLowerCase();
  if (!raw) return true;
  return DEV_HOST_MARKERS.some((marker) => raw.includes(marker));
}

/**
 * @param {string} url
 * @param {"production" | "qa"} [profile]
 */
export function isAllowedCapacitorServerUrl(url, profile = "production") {
  const normalized = String(url || "").trim().replace(/\/$/, "");
  if (!normalized.startsWith("https://")) return false;
  if (isDevCapacitorServerUrl(normalized)) return false;
  const expected = profile === "qa" ? MOBILE_QA_SERVER_ORIGIN : MOBILE_PRODUCTION_SERVER_ORIGIN;
  return normalized === expected;
}
