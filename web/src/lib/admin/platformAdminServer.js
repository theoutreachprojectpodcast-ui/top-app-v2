/**
 * Platform admin (staff console) — strict backend-gated access.
 * Default: only approved bootstrap emails.
 * Later: existing admins may grant access manually (tracked in DB columns).
 */

import { hasManualAdminGrant, isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";

/**
 * @param {{ email?: string, workosUserId?: string, profileRow?: Record<string, unknown> | null }} params
 */
export function isPlatformAdminServer({ email = "", workosUserId = "", profileRow = null } = {}) {
  void workosUserId;
  const pr = String(profileRow?.platform_role || "").toLowerCase();
  const em = String(email || "").trim().toLowerCase();
  if (isDefaultApprovedAdminEmail(em)) return true;
  if (pr === "admin" && hasManualAdminGrant(profileRow)) return true;

  return false;
}
