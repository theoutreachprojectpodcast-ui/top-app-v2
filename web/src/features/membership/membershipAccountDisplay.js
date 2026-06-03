import { membershipTierRank } from "@/lib/billing/membershipTierOrder";
import { getMembershipTierDefinition, normalizeMembershipTierKey } from "@/features/membership/membershipTiers";

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

/** @param {{ isAuthenticated: boolean, profile?: object | null }} args */
export function shouldShowMembershipPickerOnHome({ isAuthenticated, profile }) {
  if (!isAuthenticated) return true;
  return !hasChosenInitialMembership(profile);
}

/** @param {{ isAuthenticated: boolean, profile?: object | null }} args */
export function shouldShowMembershipPickerOnProfile({ isAuthenticated, profile }) {
  return isAuthenticated && hasChosenInitialMembership(profile);
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
