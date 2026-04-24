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
  return s === "active";
}

/**
 * @param {Record<string, unknown> | null | undefined} row Profile row from Supabase
 */
export function computeEntitlementsFromProfileRow(row) {
  if (!row) {
    return {
      podcastMemberContent: false,
      communityStorySubmit: false,
      isPrivilegedStaff: false,
      isPlatformAdmin: false,
    };
  }
  const tier = String(row.membership_tier || "free").toLowerCase();
  const status = String(row.membership_status || "none").toLowerCase();
  const platformRole = String(row.platform_role || "user").toLowerCase();
  const isPrivilegedStaff = platformRole === "admin" || platformRole === "moderator";
  const activePro = tier === "member" && hasActiveMemberBilling(status);
  const privilegedContent = isPrivilegedStaff || activePro;
  const isPlatformAdmin = isPlatformAdminServer({
    email: String(row.email || ""),
    workosUserId: String(row.workos_user_id || ""),
    profileRow: row,
  });
  return {
    podcastMemberContent: privilegedContent,
    communityStorySubmit: privilegedContent,
    isPrivilegedStaff,
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
