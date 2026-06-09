import { hasActiveMemberBilling } from "@/lib/account/entitlements";
import { normalizeDbMembershipTier } from "@/lib/billing/membershipTierOrder";

/** Canonical $5.99/year app access product (required on mobile). */
export const APP_ACCESS_MEMBERSHIP_DISPLAY_NAME = "App Access";
export const APP_ACCESS_MEMBERSHIP_PRICE_LABEL = "$5.99/yr";

const PAID_ACCESS_TIERS = new Set(["access", "support", "member", "sponsor"]);

/**
 * True when the account may use the native mobile app (Capacitor).
 * Requires an active paid base or advanced membership, or platform admin.
 *
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ isPlatformAdmin?: boolean }} [opts]
 */
export function hasMobileAppAccess(profile, opts = {}) {
  if (opts.isPlatformAdmin) return true;
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
