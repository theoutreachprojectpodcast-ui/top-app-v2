/**
 * @deprecated Import from `@/lib/membership/membershipAccess` — re-exports for backward compatibility.
 */
export {
  SUPPORT_MEMBERSHIP_DISPLAY_NAME,
  SUPPORT_MEMBERSHIP_PRICE_LABEL,
  PRO_MEMBERSHIP_DISPLAY_NAME,
  PRO_MEMBERSHIP_PRICE_LABEL,
  getCurrentUserMembershipTier,
  getMembershipBillingStatus,
  hasStaffBypass,
  hasActiveMembership,
  requireActiveMembership,
  requireSupportOrPro,
  requirePro,
  canSaveOrganizations,
  canAccessFullPlatform,
  canViewDirectory,
  canViewCommunity,
  canCreateCommunityContent,
  canAccessPremiumPodcast,
  canAccessTrustedPartnerOffers,
  hasMobileAppAccess,
  hasAppAccess,
  navCacheHasFreeAccess,
} from "@/lib/membership/membershipAccess";

/** @deprecated Use SUPPORT_MEMBERSHIP_DISPLAY_NAME */
export { SUPPORT_MEMBERSHIP_DISPLAY_NAME as APP_ACCESS_MEMBERSHIP_DISPLAY_NAME } from "@/lib/membership/membershipAccess";
/** @deprecated Use SUPPORT_MEMBERSHIP_PRICE_LABEL */
export { SUPPORT_MEMBERSHIP_PRICE_LABEL as APP_ACCESS_MEMBERSHIP_PRICE_LABEL } from "@/lib/membership/membershipAccess";

import { hasStaffBypass, hasActiveMembership } from "@/lib/membership/membershipAccess";

/** @deprecated Use hasStaffBypass */
export function hasStaffFreePlatformAccess(profile, opts = {}) {
  return hasStaffBypass(profile, opts);
}

/** @deprecated Use hasActiveMembership */
export function hasFreePlatformAccessFromEntitlements(profile, opts = {}) {
  return hasActiveMembership(profile, opts);
}
