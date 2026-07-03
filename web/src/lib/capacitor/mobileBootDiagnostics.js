"use client";

/**
 * Safe client logging for native boot/auth issues — never log tokens, cookies, or PII.
 * @param {string} event
 * @param {Record<string, unknown>} [meta]
 */
export function logMobileBootEvent(event, meta = {}) {
  if (typeof console === "undefined") return;
  const payload = {
    scope: "mobile-boot",
    event: String(event || "unknown"),
    ts: new Date().toISOString(),
    ...meta,
  };
  console.info("[top-mobile]", payload);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function mobileBootErrorMessage(error) {
  const msg = String(error?.message || error || "").trim();
  if (!msg) return "Could not reach The Outreach Project servers.";
  if (/failed to fetch|network|load failed|internet/i.test(msg)) {
    return "Could not reach The Outreach Project servers. Check your connection and try again.";
  }
  return "The app could not finish loading. Please try again.";
}
