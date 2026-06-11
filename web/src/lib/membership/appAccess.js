import { hasActiveMemberBilling } from "@/lib/account/entitlements";
import { isDefaultApprovedAdminEmail } from "@/lib/admin/adminPolicy";
import { normalizeDbMembershipTier } from "@/lib/billing/membershipTierOrder";

/** Canonical $5.99/year app access product (required on web and mobile). */
export const APP_ACCESS_MEMBERSHIP_DISPLAY_NAME = "App Access";
export const APP_ACCESS_MEMBERSHIP_PRICE_LABEL = "$5.99/yr";

const PAID_ACCESS_TIERS = new Set(["access", "support", "member", "sponsor"]);

/**
 * Platform admins and staff (admin / moderator roles) use the product without App Access billing.
 *
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function hasStaffFreePlatformAccess(profile, opts = {}) {
  if (opts.isPlatformAdmin || opts.isPrivilegedStaff) return true;
  if (!profile) return false;
  const role = String(profile.platformRole ?? profile.platform_role ?? "user").toLowerCase();
  if (role === "admin" || role === "moderator") return true;
  const email = String(profile.email ?? profile.workosEmail ?? "").trim().toLowerCase();
  if (email && isDefaultApprovedAdminEmail(email)) return true;
  return false;
}

/**
 * True when the account may use the product (web + Capacitor mobile app).
 * Requires an active paid base or advanced membership, or platform admin / staff.
 *
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function hasMobileAppAccess(profile, opts = {}) {
  if (hasStaffFreePlatformAccess(profile, opts)) return true;
  if (!profile) return false;

  const tier = normalizeDbMembershipTier(
    profile.membershipTier ?? profile.membership_tier ?? "free",
  );
  const status = String(
    profile.membershipBillingStatus ?? profile.membership_status ?? "none",
  ).toLowerCase();

  if (PAID_ACCESS_TIERS.has(tier) && hasActiveMemberBilling(status)) return true;

  const subId = String(profile.stripeSubscriptionId ?? profile.stripe_subscription_id ?? "").trim();
  if (subId && PAID_ACCESS_TIERS.has(tier)) return true;

  if (String(profile.membershipSource ?? profile.membership_source ?? "").toLowerCase() === "manual") {
    return PAID_ACCESS_TIERS.has(tier);
  }

  return false;
}

/** @alias hasMobileAppAccess */
export const hasAppAccess = hasMobileAppAccess;

/**
 * Entitlements snapshot for nav cache / gates while profile hydrates.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean }} [opts]
 */
export function hasFreePlatformAccessFromEntitlements(profile, opts = {}) {
  return hasMobileAppAccess(profile, opts);
}

/**
 * Whether sessionStorage nav cache should treat the user as having App Access
 * (paid tier, staff, or platform admin).
 *
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean, isPrivilegedStaff?: boolean } | null | undefined} entitlements
 */
export function navCacheHasFreeAccess(profile, entitlements) {
  return hasMobileAppAccess(profile, {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  });
}
