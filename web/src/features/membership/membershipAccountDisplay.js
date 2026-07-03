import { hasActiveMemberBilling } from "@/lib/account/entitlements";
import { membershipTierRank } from "@/lib/billing/membershipTierOrder";
import {
  getMembershipTierDefinition,
  MEMBERSHIP_TIER_KEYS,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

/** Human-readable billing status from profile / Stripe sync. */
export function formatMembershipBillingStatus(raw) {
  const s = String(raw || "none").toLowerCase().trim();
  if (!s || s === "none") return "No active subscription";
  if (s === "active") return "Active";
  if (s === "trialing") return "Trial";
  if (s === "past_due") return "Past due";
  if (s === "canceled" || s === "cancelled") return "Canceled";
  if (s === "incomplete") return "Incomplete";
  if (s === "unpaid") return "Unpaid";
  return s.replace(/_/g, " ");
}

/**
 * True after the account finished onboarding (initial tier / intent choice).
 * Until then, the tier picker stays on home; afterward it lives on profile.
 */
export function hasChosenInitialMembership(profile) {
  if (!profile || typeof profile !== "object") return false;
  return !!profile.onboardingCompleted;
}

/** Membership tier picker is never an inline home section — use post-auth modal instead. */
export function shouldShowMembershipPickerOnHome() {
  return false;
}

/** True when the account is on the free tier with no active paid subscription. */
export function isFreeOnlyMembershipAccount(tierKey, billingStatus) {
  const tier = normalizeMembershipTierKey(tierKey);
  if (tier !== MEMBERSHIP_TIER_KEYS.NONE) return false;
  return !hasActiveMemberBilling(billingStatus);
}

/**
 * Profile upsell: signed-in users who finished initial setup but stayed on free membership.
 * @param {{ isAuthenticated: boolean, profile?: object | null, tierKey?: string, billingStatus?: string }} args
 */
export function shouldShowMembershipPickerOnProfile({
  isAuthenticated,
  profile,
  tierKey,
  billingStatus,
}) {
  if (!isAuthenticated || !hasChosenInitialMembership(profile)) return false;
  const tier = tierKey ?? profile?.membershipStatus ?? profile?.membershipTier;
  const billing = billingStatus ?? profile?.membershipBillingStatus ?? profile?.membership_status;
  return isFreeOnlyMembershipAccount(tier, billing);
}

/** Post-auth modal: local/demo accounts that have not picked an initial tier yet. */
export function shouldShowMembershipPickerModal({ isAuthenticated, profile, sessionKind }) {
  if (!isAuthenticated || hasChosenInitialMembership(profile)) return false;
  if (sessionKind === "workos") return false;
  return true;
}

/** Short line under “Membership / account” in the header menu. */
export function membershipAccountMenuHint({ isAuthenticated, tierKey, billingStatus }) {
  if (!isAuthenticated) return "Sign in to view your plan";
  const def = getMembershipTierDefinition(tierKey);
  const bill = formatMembershipBillingStatus(billingStatus);
  if (bill !== "No active subscription") return `${def.shortLabel} · ${bill}`;
  return def.label;
}

/**
 * Home tier card visibility + CTA mode from signed-in account tier.
 * @returns {{ visible: boolean, isCurrent: boolean, ctaMode: "signin" | "current" | "upgrade" | "included" }}
 */
export function resolveHomeMembershipPlanView(planTierKey, currentTierKey, isAuthenticated) {
  const plan = normalizeMembershipTierKey(planTierKey);
  const current = normalizeMembershipTierKey(currentTierKey);
  const planRank = membershipTierRank(plan);
  const currentRank = membershipTierRank(current);

  if (!isAuthenticated) {
    return { visible: true, isCurrent: false, ctaMode: "signin" };
  }
  if (plan === current) {
    return { visible: true, isCurrent: true, ctaMode: "current" };
  }
  if (planRank < currentRank) {
    return { visible: false, isCurrent: false, ctaMode: "included" };
  }
  return { visible: true, isCurrent: false, ctaMode: "upgrade" };
}
