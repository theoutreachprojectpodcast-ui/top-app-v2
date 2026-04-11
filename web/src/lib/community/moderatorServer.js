/**
 * Server-only moderator check for community moderation routes.
 * Prefer COMMUNITY_MODERATOR_EMAILS (secret) over NEXT_PUBLIC_* when available.
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
export function isCommunityModeratorServer({ email = "", workosUserId = "", profileRow = null } = {}) {
  const pr = String(profileRow?.platform_role || "").toLowerCase();
  if (pr === "moderator" || pr === "admin") return true;

  const emails = splitList(process.env.COMMUNITY_MODERATOR_EMAILS);
  const userIds = splitList(process.env.COMMUNITY_MODERATOR_WORKOS_USER_IDS);
  const pubEmails = splitList(process.env.NEXT_PUBLIC_COMMUNITY_MODERATOR_EMAILS).map((e) => e.toLowerCase());
  const pubUserIds = splitList(process.env.NEXT_PUBLIC_COMMUNITY_MODERATOR_USER_IDS);

  const em = String(email || "").trim().toLowerCase();
  const uid = String(workosUserId || "").trim();

  if (em && emails.map((e) => e.toLowerCase()).includes(em)) return true;
  if (uid && userIds.includes(uid)) return true;
  if (em && pubEmails.includes(em)) return true;
  if (uid && pubUserIds.includes(uid)) return true;

  return false;
}
