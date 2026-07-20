/**
 * DB-backed entitlements (TOP v0.3). Do not grant member-only capabilities from UI alone.
 */

import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import {
  canAccessFullPlatform,
  canAccessPremiumPodcast,
  canAccessTrustedPartnerOffers,
  canCreateCommunityContent,
  canSaveOrganizations,
  canViewCommunity,
  canViewDirectory,
  hasActiveMembership,
} from "@/lib/membership/membershipAccess";

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

function profileShapeFromRow(row) {
  if (!row) return null;
  return {
    membershipTier: row.membership_tier,
    membership_tier: row.membership_tier,
    membershipBillingStatus: row.billing_status ?? row.membership_status,
    membership_status: row.membership_status,
    billing_status: row.membership_status,
    membershipSource: row.membership_source,
    membership_source: row.membership_source,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripe_subscription_id: row.stripe_subscription_id,
    platformRole: row.platform_role,
    platform_role: row.platform_role,
    email: row.email,
    migratedToProUntil: row.migrated_to_pro_until,
    migrated_to_pro_until: row.migrated_to_pro_until,
    renewalDate: row.renewal_date,
    renewal_date: row.renewal_date,
  };
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
      directoryAccess: false,
      saveOrganizationsAccess: false,
      fullPlatformAccess: false,
      communityViewAccess: false,
      trustedPartnerOffers: false,
      isPrivilegedStaff: false,
      isPlatformAdmin: false,
      hasActiveMembership: false,
      membershipTier: "none",
    };
  }

  const privilegedStaff = isPrivilegedStaff(row);
  const isPlatformAdmin = isPlatformAdminServer({
    email: String(row.email || ""),
    workosUserId: String(row.workos_user_id || ""),
    profileRow: row,
  });
  const profile = profileShapeFromRow(row);
  const opts = { isPlatformAdmin, isPrivilegedStaff: privilegedStaff };
  const activeMembership = hasActiveMembership(profile, opts);

  return {
    directoryAccess: canViewDirectory(profile, opts),
    saveOrganizationsAccess: canSaveOrganizations(profile, opts),
    fullPlatformAccess: canAccessFullPlatform(profile, opts),
    communityViewAccess: canViewCommunity(profile, opts),
    trustedPartnerOffers: canAccessTrustedPartnerOffers(profile, opts),
    podcastMemberContent: canAccessPremiumPodcast(profile, opts),
    communityStorySubmit: canCreateCommunityContent(profile, opts),
    communityPostCreate: canCreateCommunityContent(profile, opts),
    isPrivilegedStaff: privilegedStaff,
    isPlatformAdmin,
    hasActiveMembership: activeMembership,
    membershipTier: activeMembership
      ? String(row.membership_tier || "free").toLowerCase() === "member"
        ? "pro"
        : ["support", "access"].includes(String(row.membership_tier || "").toLowerCase())
          ? "support"
          : String(row.membership_tier || "free").toLowerCase()
      : "none",
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
 * Pro members (and staff) may create community posts.
 * @param {Record<string, unknown> | null | undefined} row
 */
export function profileMayCreateCommunityPost(row) {
  if (!row) return false;
  const ent = computeEntitlementsFromProfileRow(row);
  return ent.communityPostCreate === true;
}

/** @deprecated Use membershipAccess.requirePro via computeEntitlementsFromProfileRow */
export function tierAllowsCommunityStorySubmit(row) {
  return profileMaySubmitCommunityStory(row);
}
