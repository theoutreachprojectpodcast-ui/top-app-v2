/**
 * DB-backed entitlements (tORP v0.3). Do not grant member-only capabilities from UI alone.
 */

import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";

/**
 * Active paid subscription states we treat as entitled for member-only product surfaces.
 * @param {string} membershipStatus
 */
export function hasActiveMemberBilling(membershipStatus) {
  const s = String(membershipStatus || "").toLowerCase();
  return s === "active" || s === "trialing";
}

function isPrivilegedStaff(row) {
  const platformRole = String(row?.platform_role || "user").toLowerCase();
  return platformRole === "admin" || platformRole === "moderator";
}

function paidTierWithActiveBilling(tier, membershipStatus) {
  const t = String(tier || "").toLowerCase();
  if (!["access", "support", "member", "sponsor"].includes(t)) return false;
  return hasActiveMemberBilling(membershipStatus);
}

/**
 * Pro (DB: membership_tier = member) — community story submission.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function tierAllowsCommunityStorySubmit(row) {
  const tier = String(row?.membership_tier || "free").toLowerCase();
  if (tier !== "member") return false;

  const status = String(row?.membership_status || "none").toLowerCase();
  if (hasActiveMemberBilling(status)) return true;

  // Webhook may lag behind checkout; subscription id means Pro was purchased.
  if (String(row?.stripe_subscription_id || "").trim()) return true;

  // Admin-granted Pro in dashboard (membership_source manual).
  if (String(row?.membership_source || "").toLowerCase() === "manual") return true;

  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} row Profile row from Supabase
 */
export function computeEntitlementsFromProfileRow(row) {
  if (!row) {
    return {
      podcastMemberContent: false,
      communityStorySubmit: false,
      communityPostCreate: false,
      isPrivilegedStaff: false,
      isPlatformAdmin: false,
    };
  }
  const tier = String(row.membership_tier || "free").toLowerCase();
  const status = String(row.membership_status || "none").toLowerCase();
  const privilegedStaff = isPrivilegedStaff(row);
  const privilegedContent = privilegedStaff || paidTierWithActiveBilling(tier, status);
  const isPlatformAdmin = isPlatformAdminServer({
    email: String(row.email || ""),
    workosUserId: String(row.workos_user_id || ""),
    profileRow: row,
  });
  return {
    podcastMemberContent: privilegedContent,
    /** V1: only staff/moderators create community posts; members comment and react. */
    communityStorySubmit: privilegedStaff || isPlatformAdmin,
    communityPostCreate: privilegedStaff || isPlatformAdmin,
    isPrivilegedStaff: privilegedStaff,
    isPlatformAdmin,
  };
}

/**
 * Server gate for community story POST.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function profileMaySubmitCommunityStory(row) {
  if (!row) return false;
  const ent = computeEntitlementsFromProfileRow(row);
  return ent.communityStorySubmit === true;
}

/**
 * V1 moderator-only post creation (admins + platform_role admin/moderator).
 * @param {Record<string, unknown> | null | undefined} row
 */
export function profileMayCreateCommunityPost(row) {
  if (!row) return false;
  const ent = computeEntitlementsFromProfileRow(row);
  return ent.communityPostCreate === true;
}
