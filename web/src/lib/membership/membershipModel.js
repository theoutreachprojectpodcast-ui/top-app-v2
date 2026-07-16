/**
 * Central membership roles for gating and billing UI.
 * User-facing checkout: Pro only (stored as `member` in DB).
 * Sponsor and admin are internal platform roles — not sold in profile billing.
 * Legacy Support remains for display / upgrade of existing subscribers.
 */

import { normalizeMembershipTierKey, MEMBERSHIP_TIER_KEYS } from "@/features/membership/membershipTiers";

/** @typedef {'support' | 'pro' | 'sponsor' | 'admin'} MembershipRole */

/** Checkout / DB tier keys shown in Membership & Billing (Pro only). */
export const USER_BILLING_CHECKOUT_TIERS = ["member"];

/** Tiers that grant base platform access (Pro product + sponsor). */
const BASE_ACCESS_TIERS = new Set(["member", "sponsor"]);

/** @param {string} tierKey */
export function isProMembershipTier(tierKey) {
  return normalizeMembershipTierKey(tierKey) === MEMBERSHIP_TIER_KEYS.MEMBER;
}

/** @param {string} tierKey */
export function isSupportMembershipTier(tierKey) {
  const t = normalizeMembershipTierKey(tierKey);
  return t === MEMBERSHIP_TIER_KEYS.SUPPORT || t === MEMBERSHIP_TIER_KEYS.ACCESS;
}

/** @param {string} tierKey */
export function hasBasePlatformMembership(tierKey) {
  const t = normalizeMembershipTierKey(tierKey);
  return BASE_ACCESS_TIERS.has(t);
}

/**
 * User-facing role label for billing chrome.
 * @param {string} tierKey
 * @param {{ isPlatformAdmin?: boolean }} [opts]
 */
export function membershipRoleLabel(tierKey, opts = {}) {
  if (opts.isPlatformAdmin) return "Admin";
  const t = normalizeMembershipTierKey(tierKey);
  if (t === MEMBERSHIP_TIER_KEYS.MEMBER) return "Pro";
  if (t === MEMBERSHIP_TIER_KEYS.SPONSOR) return "Sponsor";
  if (t === MEMBERSHIP_TIER_KEYS.SUPPORT || t === MEMBERSHIP_TIER_KEYS.ACCESS) return "Support (legacy)";
  return "Free";
}

/** Tier definitions safe for user billing / comparison UI (no sponsor sold here). */
export function userBillingTierDefinitions(allDefinitions) {
  return allDefinitions.filter((tier) => {
    const id = String(tier.id || "");
    return id === MEMBERSHIP_TIER_KEYS.NONE || id === MEMBERSHIP_TIER_KEYS.MEMBER;
  });
}
