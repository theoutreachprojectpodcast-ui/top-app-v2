import { isDemoModeEnabled } from "@/lib/runtime/launchMode";

/**
 * Production go-live toggle: set `ENABLE_ADMIN_EMAIL_LOGIN=1` on Vercel Production to use
 * approved-email magic-link admin sign-in instead of WorkOS for `/admin`.
 * Set to `0` before launch if you want WorkOS-only admin.
 */
export function isAdminEmailLoginProductionEnabled() {
  const explicit = String(process.env.ENABLE_ADMIN_EMAIL_LOGIN || "").trim().toLowerCase();
  if (explicit === "1" || explicit === "true") return true;
  if (explicit === "0" || explicit === "false") return false;
  return false;
}

/** @returns {string} */
export function adminEmailSessionPassword() {
  const workos = String(process.env.WORKOS_COOKIE_PASSWORD || "").trim();
  if (workos.length >= 32) return workos;
  const dedicated = String(process.env.ADMIN_EMAIL_SESSION_SECRET || "").trim();
  if (dedicated.length >= 32) return dedicated;
  const legacy = String(process.env.QA_DEMO_ADMIN_SESSION_SECRET || "").trim();
  if (legacy.length >= 32) return legacy;
  return "";
}

/**
 * Admin console email magic-link sessions (no WorkOS).
 * - QA / Preview: on when demo flows are enabled and a sealing secret exists.
 * - Production: on when `ENABLE_ADMIN_EMAIL_LOGIN=1` and sealing secret exists.
 */
export function isAdminEmailLoginEnabled() {
  if (adminEmailSessionPassword().length < 32) return false;
  if (isAdminEmailLoginProductionEnabled()) return true;
  return isDemoModeEnabled();
}
