/** Official Outreach Project moderator identity for founder onboarding posts. */

export const OUTREACH_MODERATOR_AUTHOR_ID = "company-top-app";

export const OUTREACH_MODERATOR_AVATAR_URL = "/community/outreach-project-moderator.png";

const MODERATOR_NAME_PATTERN =
  /^(josh|hodge|josh\s*&\s*hodge|the outreach project(\s+team)?)$/i;

const LEGACY_FOUNDER_NAMES = {
  marcus: "Josh",
  liz: "Hodge",
};

/**
 * @param {string} name
 */
export function remapLegacyModeratorName(name) {
  const raw = String(name || "").trim();
  if (!raw) return raw;
  const key = raw.split(/\s+/)[0].toLowerCase();
  return LEGACY_FOUNDER_NAMES[key] || raw;
}

/**
 * Ensures founder/moderator rows always use the Outreach logo avatar (never in post media).
 * @param {Record<string, unknown>} row
 */
export function normalizeModeratorAuthorFields(row) {
  if (!row || typeof row !== "object") return row;

  const authorId = String(row.author_id ?? row.authorId ?? "").trim();
  const nameRaw = String(row.author_name ?? row.authorName ?? "").trim();
  const name = remapLegacyModeratorName(nameRaw);
  const avatar = String(row.author_avatar_url ?? row.authorAvatarUrl ?? "");

  const isModerator =
    authorId === OUTREACH_MODERATOR_AUTHOR_ID ||
    MODERATOR_NAME_PATTERN.test(name) ||
    MODERATOR_NAME_PATTERN.test(nameRaw) ||
    /^(marcus|liz)\b/i.test(nameRaw) ||
    avatar.includes("outreach-project-moderator") ||
    avatar.includes("/community/admin-");

  if (!isModerator) return row;

  return {
    ...row,
    author_id: OUTREACH_MODERATOR_AUTHOR_ID,
    authorId: OUTREACH_MODERATOR_AUTHOR_ID,
    author_name: name || "The Outreach Project",
    authorName: name || "The Outreach Project",
    author_avatar_url: OUTREACH_MODERATOR_AVATAR_URL,
    authorAvatarUrl: OUTREACH_MODERATOR_AVATAR_URL,
  };
}

/**
 * @param {{ authorId?: string, authorName?: string, authorAvatarUrl?: string }} post
 */
export function isOutreachModeratorPost(post) {
  if (!post) return false;
  const postType = String(post.postType || "").trim();
  if (postType === "admin_update" || postType.startsWith("platform_guide")) return true;
  const authorId = String(post.authorId || "").trim();
  if (authorId === OUTREACH_MODERATOR_AUTHOR_ID) return true;
  const name = remapLegacyModeratorName(String(post.authorName || "").trim());
  if (MODERATOR_NAME_PATTERN.test(name)) return true;
  if (/^(marcus|liz)\b/i.test(String(post.authorName || ""))) return true;
  const avatar = String(post.authorAvatarUrl || "");
  return avatar.includes("outreach-project-moderator") || avatar.includes("/community/admin-");
}

/**
 * @param {string} [linkUrl]
 * @returns {{ href: string, label: string } | null}
 */
export function parsePostCta(linkUrl) {
  const raw = String(linkUrl || "").trim();
  if (!raw.startsWith("cta:")) return null;
  const rest = raw.slice(4);
  const pipe = rest.indexOf("|");
  if (pipe < 0) return null;
  const href = rest.slice(0, pipe).trim();
  const label = rest.slice(pipe + 1).trim();
  if (!href || !label) return null;
  return { href, label };
}
