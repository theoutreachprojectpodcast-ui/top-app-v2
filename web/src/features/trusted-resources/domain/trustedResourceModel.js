/**
 * Trusted Resource curated type — used only by `/trusted` + `TrustedResourceCard`.
 * Directory rows may be joined for inheritance; Trusted Resource fields override when present.
 */

/**
 * Normalize image URLs so we can detect accidental reuse of the same asset for hero + logo.
 * @param {string} url
 * @returns {string}
 */
export function comparableImageUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  if (s.startsWith("//")) return "";
  if (s.startsWith("/")) {
    const path = s.split("?")[0] || "";
    return path.toLowerCase();
  }
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return `${u.hostname}${(u.pathname || "").split("?")[0]}`.toLowerCase();
  } catch {
    return s.toLowerCase().split("?")[0];
  }
}

/**
 * If the logo URL matches the listing hero/header URL, drop the logo so we fall back to
 * category icon rather than duplicating the hero asset in the mark slot.
 *
 * @param {string} logoUrl
 * @param {string} headerUrl
 * @param {{ profile?: string, org?: string }} fallbacks — other candidate logos (directory)
 * @returns {string}
 */
export function dedupeTrustedResourceLogoAgainstHeader(logoUrl, headerUrl, fallbacks = {}) {
  const hero = comparableImageUrl(headerUrl);
  const primary = String(logoUrl || "").trim();
  if (!primary || !hero) return primary;

  if (comparableImageUrl(primary) !== hero) return primary;

  const p = String(fallbacks.profile || "").trim();
  if (p && comparableImageUrl(p) !== hero) return p;

  const o = String(fallbacks.org || "").trim();
  if (o && comparableImageUrl(o) !== hero) return o;

  return "";
}
