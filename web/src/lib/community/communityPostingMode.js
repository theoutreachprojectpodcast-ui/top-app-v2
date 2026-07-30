import { getAdminSetting, upsertAdminSetting } from "@/lib/admin/adminSettings";

/** @typedef {'open' | 'post_review' | 'pre_approval' | 'admin_only'} CommunityPostingMode */

export const COMMUNITY_POSTING_MODE_KEY = "community_posting_mode";

export const COMMUNITY_POSTING_MODE_OPTIONS = [
  {
    value: "open",
    label: "Open posting",
    description: "Members with access can publish immediately. Moderators can still hide or remove posts.",
  },
  {
    value: "post_review",
    label: "Post-review moderation",
    description: "Posts publish immediately and appear in a review queue for moderators.",
  },
  {
    value: "pre_approval",
    label: "Pre-approval moderation",
    description: "Posts stay hidden until a moderator approves them.",
  },
  {
    value: "admin_only",
    label: "Admin-only posting",
    description: "Only staff and admins can create posts. Members can still comment and react.",
  },
];

const DEFAULT_MODE = "open";

/**
 * @param {unknown} raw
 * @returns {CommunityPostingMode}
 */
export function normalizeCommunityPostingMode(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "open" || value === "post_review" || value === "pre_approval" || value === "admin_only") {
    return value;
  }
  // Legacy aliases
  if (value === "open_posting" || value === "publish") return "open";
  if (value === "pending_review" || value === "moderation_first") return "pre_approval";
  return DEFAULT_MODE;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} admin
 * @returns {Promise<CommunityPostingMode>}
 */
export async function resolveCommunityPostingMode(admin) {
  if (!admin) return DEFAULT_MODE;
  try {
    const settings = await getAdminSetting(admin, COMMUNITY_POSTING_MODE_KEY, { mode: DEFAULT_MODE });
    return normalizeCommunityPostingMode(settings?.mode ?? settings?.value ?? DEFAULT_MODE);
  } catch {
    return DEFAULT_MODE;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {CommunityPostingMode} mode
 * @param {string} [updatedBy]
 */
export async function saveCommunityPostingMode(admin, mode, updatedBy = "") {
  const next = normalizeCommunityPostingMode(mode);
  await upsertAdminSetting(admin, COMMUNITY_POSTING_MODE_KEY, { mode: next }, updatedBy);
  return next;
}

/**
 * Whether a Pro member (non-staff) may create posts under the current mode.
 * @param {CommunityPostingMode} mode
 */
export function membersMayCreatePosts(mode) {
  return normalizeCommunityPostingMode(mode) !== "admin_only";
}

/**
 * Initial status + publish fields for a new member post.
 * @param {CommunityPostingMode} mode
 * @param {{ isStaff?: boolean }} [opts]
 */
export function memberPostCreateFields(mode, opts = {}) {
  const normalized = normalizeCommunityPostingMode(mode);
  const now = new Date().toISOString();
  if (opts.isStaff) {
    return { status: "approved", published_at: now, reviewed_at: now };
  }
  if (normalized === "pre_approval") {
    return { status: "pending_review", published_at: null };
  }
  // open + post_review: publish immediately
  return { status: "approved", published_at: now };
}

/**
 * Whether author edits of published posts should return to the review queue.
 * @param {CommunityPostingMode} mode
 */
export function authorEditRequiresReapproval(mode) {
  return normalizeCommunityPostingMode(mode) === "pre_approval";
}
