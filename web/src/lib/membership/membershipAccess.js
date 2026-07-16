/**
 * Single source of truth for membership tier access (web + mobile + API).
 *
 * App access requires Pro Membership ($5.99/yr), sponsor/staff, or an active
 * complimentary Support→Pro migrated entitlement through the original paid end date.
 * Legacy Support / App Access tiers remain recognized for display and upgrade UX only.
 */
import { hasActiveMemberBilling } from "@/lib/account/entitlements";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { normalizeMembershipTierKey, MEMBERSHIP_TIER_KEYS } from "@/features/membership/membershipTiers";
import { normalizeDbMembershipTier as normalizeBillingTier } from "@/lib/billing/membershipTierOrder";
import { hasMigratedSupportProEntitlement } from "@/lib/membership/supportToProMigrationShared";

/** @deprecated Support Membership product — kept for legacy subscriber labels. */
export const SUPPORT_MEMBERSHIP_DISPLAY_NAME = "Support Membership";
/** @deprecated Historical Support price — purchasable only when feature flag is on. */
export const SUPPORT_MEMBERSHIP_PRICE_LABEL = "$0.99/yr";
export const PRO_MEMBERSHIP_DISPLAY_NAME = "Pro Membership";
export const PRO_MEMBERSHIP_PRICE_LABEL = "$5.99/yr";

const SUPPORT_TIERS = new Set(["access", "support"]);
const PRO_TIERS = new Set(["member"]);
/** Tiers that can hold an active Stripe subscription (includes legacy Support). */
const PAID_TIERS = new Set(["access", "support", "member", "sponsor"]);
/** Tiers that unlock the app (Pro-only product). */
const APP_ACCESS_TIERS = new Set(["member", "sponsor"]);

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {'none' | 'support' | 'pro' | 'sponsor'}
 */
export function getCurrentUserMembershipTier(profile) {
  if (!profile) return "none";
  if (hasMigratedSupportProEntitlement(profile)) return "pro";
  const raw = normalizeMembershipTierKey(
    profile.membershipTier ?? profile.membership_tier ?? "free",
  );
  if (raw === MEMBERSHIP_TIER_KEYS.MEMBER) return "pro";
  if (raw === MEMBERSHIP_TIER_KEYS.SPONSOR) return "sponsor";
  if (raw === MEMBERSHIP_TIER_KEYS.SUPPORT || raw === MEMBERSHIP_TIER_KEYS.ACCESS) return "support";
  return "none";
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function getMembershipBillingStatus(profile) {
  if (!profile) return "none";
  return String(
    profile.membershipBillingStatus ??
      profile.billing_status ??
      profile.membership_status ??
      "none",
  ).toLowerCase();
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function hasStaffBypass(profile, opts = {}) {
  if (opts.isPlatformAdmin || opts.isPrivilegedStaff) return true;
  if (!profile) return false;
  const role = String(profile.platformRole ?? profile.platform_role ?? "user").toLowerCase();
  if (role === "admin" || role === "moderator") return true;
  const email = String(profile.email ?? profile.workosEmail ?? "").trim().toLowerCase();
  return !!(email && isDefaultApprovedAdminEmail(email));
}

/**
 * Active paid subscription (legacy support, pro, or sponsor) — billing status only.
 * Prefer {@link hasAppAccess} / {@link requirePro} for product gates.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function hasActiveMembership(profile, opts = {}) {
  if (hasStaffBypass(profile, opts)) return true;
  if (hasMigratedSupportProEntitlement(profile)) return true;
  if (!profile) return false;

  const tier = normalizeBillingTier(
    profile.membershipTier ?? profile.membership_tier ?? "free",
  );
  const status = getMembershipBillingStatus(profile);

  if (!PAID_TIERS.has(tier)) return false;
  if (!hasActiveMemberBilling(status)) return false;

  if (String(profile.membershipSource ?? profile.membership_source ?? "").toLowerCase() === "manual") {
    return PAID_TIERS.has(tier);
  }

  return true;
}

/** @alias hasActiveMembership */
export function requireActiveMembership(profile, opts = {}) {
  return hasActiveMembership(profile, opts);
}

/**
 * Legacy Support or Pro with active billing (upgrade UX / historical checks).
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function requireSupportOrPro(profile, opts = {}) {
  if (hasStaffBypass(profile, opts)) return true;
  if (!hasActiveMembership(profile, opts)) return false;
  const tier = getCurrentUserMembershipTier(profile);
  return tier === "support" || tier === "pro" || tier === "sponsor";
}

/**
 * Pro (or sponsor / staff) with active billing — required for app access.
 * Includes complimentary Support→Pro migrated entitlements until original period end.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function requirePro(profile, opts = {}) {
  if (hasStaffBypass(profile, opts)) return true;
  if (!profile) return false;
  if (hasMigratedSupportProEntitlement(profile)) return true;

  const tier = normalizeBillingTier(
    profile.membershipTier ?? profile.membership_tier ?? "free",
  );
  const status = getMembershipBillingStatus(profile);

  if (!APP_ACCESS_TIERS.has(tier)) return false;
  if (!hasActiveMemberBilling(status)) return false;

  const source = String(profile.membershipSource ?? profile.membership_source ?? "").toLowerCase();
  if (source === "manual" || source === "support_to_pro_migration") {
    return APP_ACCESS_TIERS.has(tier);
  }

  return true;
}

/** Public directory browsing — no membership required (home/directory is public). */
export function canViewDirectory(_profile, _opts = {}) {
  return true;
}

/** Save nonprofit directory favorites (Pro + sponsor / staff). */
export function canSaveOrganizations(profile, opts = {}) {
  return requirePro(profile, opts);
}

/** Public podcast hub — Pro Membership. */
export function canAccessPodcastHub(profile, opts = {}) {
  return requirePro(profile, opts);
}

/** Full platform (Pro, sponsor, staff). */
export function canAccessFullPlatform(profile, opts = {}) {
  return requirePro(profile, opts);
}

export function canViewCommunity(profile, opts = {}) {
  return requirePro(profile, opts);
}

export function canCreateCommunityContent(profile, opts = {}) {
  return requirePro(profile, opts);
}

export function canAccessPremiumPodcast(profile, opts = {}) {
  return requirePro(profile, opts);
}

export function canAccessTrustedPartnerOffers(profile, opts = {}) {
  return requirePro(profile, opts);
}

/** App / mobile access = Pro Membership only. */
export const hasMobileAppAccess = requirePro;
export const hasAppAccess = requirePro;

export function navCacheHasFreeAccess(profile, entitlements) {
  return requirePro(profile, {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  });
}

export { SUPPORT_TIERS, PRO_TIERS, hasMigratedSupportProEntitlement };
