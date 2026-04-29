/**
 * Sliding idle timeout for WorkOS sessions (browser cookie, httpOnly).
 * Disabled when TOP_SESSION_IDLE_MS is 0 or unset parses to 0.
 */

const DEFAULT_LAST_ACTIVE = "top_last_active_at";
const DEFAULT_SESSION_FP = "top_session_fp";

export function workosSessionCookieName() {
  return String(process.env.WORKOS_COOKIE_NAME || "wos-session").trim();
}

export function lastActiveCookieName() {
  return String(process.env.TOP_LAST_ACTIVE_COOKIE || DEFAULT_LAST_ACTIVE).trim() || DEFAULT_LAST_ACTIVE;
}

export function sessionFingerprintCookieName() {
  return String(process.env.TOP_SESSION_FP_COOKIE || DEFAULT_SESSION_FP).trim() || DEFAULT_SESSION_FP;
}

/** Prefix of sealed session cookie used to detect rotation (login / refresh). */
export function fingerprintFromSessionCookieValue(value) {
  const v = String(value || "");
  if (!v) return "";
  return v.slice(0, 40);
}

/**
 * @returns {number} Milliseconds of allowed inactivity; 0 = feature off.
 */
export function sessionIdleTimeoutMs() {
  const raw = String(process.env.TOP_SESSION_IDLE_MS || "").trim();
  if (raw === "0") return 0;
  if (!raw) return 24 * 60 * 60 * 1000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 24 * 60 * 60 * 1000;
  return n;
}
