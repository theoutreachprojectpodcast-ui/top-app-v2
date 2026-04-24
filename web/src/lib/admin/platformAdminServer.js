/**
 * Platform admin (staff console) — distinct from community "moderator" tools.
 * Admin = full /admin access; moderators may still use community pending queue only.
 */

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * @param {{ email?: string, workosUserId?: string, profileRow?: Record<string, unknown> | null }} params
 */
export function isPlatformAdminServer({ email = "", workosUserId = "", profileRow = null } = {}) {
  const pr = String(profileRow?.platform_role || "").toLowerCase();
  if (pr === "admin") return true;

  const allowEmails = splitList(process.env.PLATFORM_ADMIN_EMAILS).map((e) => e.toLowerCase());
  const em = String(email || "").trim().toLowerCase();
  if (em && allowEmails.includes(em)) return true;

  return false;
}
