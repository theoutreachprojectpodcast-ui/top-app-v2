/**
 * Single source of truth for membership tier access (web + mobile + API).
 */
import { hasActiveMemberBilling } from "@/lib/account/entitlements";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { normalizeMembershipTierKey, MEMBERSHIP_TIER_KEYS } from "@/features/membership/membershipTiers";
import { normalizeDbMembershipTier as normalizeBillingTier } from "@/lib/billing/membershipTierOrder";

export const SUPPORT_MEMBERSHIP_DISPLAY_NAME = "Support Membership";
export const SUPPORT_MEMBERSHIP_PRICE_LABEL = "$0.99/yr";
export const PRO_MEMBERSHIP_DISPLAY_NAME = "Pro Membership";
export const PRO_MEMBERSHIP_PRICE_LABEL = "$5.99/yr";

const SUPPORT_TIERS = new Set(["access", "support"]);
const PRO_TIERS = new Set(["member"]);
const PAID_TIERS = new Set(["access", "support", "member", "sponsor"]);

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {'none' | 'support' | 'pro' | 'sponsor'}
 */
export function getCurrentUserMembershipTier(profile) {
  if (!profile) return "none";
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
 * Active paid subscription (support, pro, legacy access, or sponsor).
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function hasActiveMembership(profile, opts = {}) {
  if (hasStaffBypass(profile, opts)) return true;
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
 * Support or Pro with active billing.
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
 * Pro (or sponsor / staff) with active billing.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function requirePro(profile, opts = {}) {
  if (hasStaffBypass(profile, opts)) return true;
  if (!hasActiveMembership(profile, opts)) return false;
  const tier = getCurrentUserMembershipTier(profile);
  return tier === "pro" || tier === "sponsor";
}

export function canViewDirectory(profile, opts = {}) {
  return requireSupportOrPro(profile, opts);
}

/** Save nonprofit directory favorites (Pro + sponsor / staff). */
export function canSaveOrganizations(profile, opts = {}) {
  return requirePro(profile, opts);
}

/** Public podcast hub (episodes, guests, apply) — Support + Pro. */
export function canAccessPodcastHub(profile, opts = {}) {
  return requireSupportOrPro(profile, opts);
}

/** Full platform beyond directory + saves + podcast hub (Pro, sponsor, staff). */
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

/** @alias hasActiveMembership */
export const hasMobileAppAccess = hasActiveMembership;
export const hasAppAccess = hasActiveMembership;

export function navCacheHasFreeAccess(profile, entitlements) {
  return hasActiveMembership(profile, {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  });
}
