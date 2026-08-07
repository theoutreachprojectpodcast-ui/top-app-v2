/**
 * Business code normalization, validation, and reserved-term checks.
 * Business codes are org prefixes only — not redeem credentials.
 */

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,22}[A-Z0-9]$|^[A-Z0-9]{2,24}$/;

/** Reserved / misleading / system terms (uppercase). */
export const RESERVED_BUSINESS_CODES = new Set([
  "ADMIN",
  "API",
  "BULK",
  "FREE",
  "LICENSE",
  "MEMBER",
  "NULL",
  "OUTREACH",
  "OUTREACH-TEAM",
  "PRO",
  "ROOT",
  "SPONSOR",
  "STAFF",
  "STRIPE",
  "SUPPORT",
  "SYSTEM",
  "TEST",
  "THEOUTREACHPROJECT",
  "TOP",
  "UNDEFINED",
  "WORKOS",
]);

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeBusinessCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, code: string } | { ok: false, error: string, message: string }}
 */
export function validateBusinessCode(raw) {
  const code = normalizeBusinessCode(raw);
  if (!code || code.length < 2) {
    return {
      ok: false,
      error: "business_code_too_short",
      message: "Business code must be at least 2 characters.",
    };
  }
  if (code.length > 24) {
    return {
      ok: false,
      error: "business_code_too_long",
      message: "Business code must be 24 characters or fewer.",
    };
  }
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      error: "business_code_invalid",
      message: "Use letters, numbers, and hyphens only (e.g. ACME or MARS-PA).",
    };
  }
  if (RESERVED_BUSINESS_CODES.has(code)) {
    return {
      ok: false,
      error: "business_code_reserved",
      message: "That business code is reserved. Choose a different code.",
    };
  }
  return { ok: true, code };
}
