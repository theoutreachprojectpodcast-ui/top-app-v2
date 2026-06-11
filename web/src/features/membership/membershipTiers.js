/**
 * Membership domain — tier definitions for UI and billing/entitlements.
 * Storage: profile.membershipStatus uses normalized keys from normalizeMembershipTierKey().
 *
 * Mobile app: App Access ($5.99/yr) is required on web and in Capacitor. Support / Pro are optional upgrades.
 */

import {
  APP_ACCESS_MEMBERSHIP_DISPLAY_NAME,
  APP_ACCESS_MEMBERSHIP_PRICE_LABEL,
} from "@/lib/membership/appAccess";

export { APP_ACCESS_MEMBERSHIP_DISPLAY_NAME, APP_ACCESS_MEMBERSHIP_PRICE_LABEL };

/** Advanced optional tier — Stripe `STRIPE_PRICE_SUPPORT_MONTHLY`. */
export const SUPPORT_MEMBERSHIP_DISPLAY_NAME = "Support with $1";
export const SUPPORT_MEMBERSHIP_PRICE_LABEL = "$1/mo";

/** Advanced optional tier — Stripe `STRIPE_PRICE_PRO_MONTHLY`. */
export const PRO_MEMBERSHIP_DISPLAY_NAME = "Pro Membership";
export const PRO_MEMBERSHIP_PRICE_LABEL = "$5.99/mo";

export const MEMBERSHIP_TIER_KEYS = {
  NONE: "none",
  ACCESS: "access",
  SUPPORT: "support",
  SPONSOR: "sponsor",
  MEMBER: "member",
};

/** @typedef {{ id: string, label: string, shortLabel: string, benefits: string[], isMember: boolean, hint: string, priceLabel?: string, requiredForMobile?: boolean, advancedUpgrade?: boolean }} MembershipTierDefinition */

/** @type {MembershipTierDefinition[]} */
export const MEMBERSHIP_TIER_DEFINITIONS = [
  {
    id: MEMBERSHIP_TIER_KEYS.ACCESS,
    label: APP_ACCESS_MEMBERSHIP_DISPLAY_NAME,
    shortLabel: "App Access",
    priceLabel: APP_ACCESS_MEMBERSHIP_PRICE_LABEL,
    requiredForMobile: true,
    benefits: [
      "Full access on the website and iOS/Android app",
      "Browse sponsors, trusted resources, and community",
      "Save favorites and manage your profile",
    ],
    isMember: true,
    hint: "Required for web and mobile app access. Billed annually at $5.99/year.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.NONE,
    label: "No membership",
    shortLabel: "None",
    benefits: [
      "Website and app preview only until App Access is activated",
    ],
    isMember: false,
    hint: "App Access ($5.99/year) is required on web and mobile.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SUPPORT,
    label: SUPPORT_MEMBERSHIP_DISPLAY_NAME,
    shortLabel: "Support",
    priceLabel: SUPPORT_MEMBERSHIP_PRICE_LABEL,
    advancedUpgrade: true,
    benefits: [
      "Everything in App Access",
      "Priority newsletter identity and supporter recognition pathways",
      "Enhanced profile presentation as features roll out",
    ],
    isMember: false,
    hint: "Optional upgrade for existing App Access members.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.MEMBER,
    label: PRO_MEMBERSHIP_DISPLAY_NAME,
    shortLabel: "Pro",
    priceLabel: PRO_MEMBERSHIP_PRICE_LABEL,
    advancedUpgrade: true,
    benefits: [
      "Everything in App Access",
      "Submit community stories for moderation review",
      "Member-only flows and enhanced profile fields",
    ],
    isMember: true,
    hint: "Optional upgrade for existing App Access members.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SPONSOR,
    label: "Sponsor Membership",
    shortLabel: "Sponsor",
    advancedUpgrade: true,
    benefits: [
      "Partnership pathways aligned to sponsor packages",
      "Priority routing for sponsorship inquiries",
      "Co-marketing touchpoints per executed agreement",
    ],
    isMember: false,
    hint: "Assigned after sponsorship onboarding. Separate from mission partner packages.",
  },
];

export function getMembershipTierDefinition(tierKey) {
  const id = normalizeMembershipTierKey(tierKey);
  return MEMBERSHIP_TIER_DEFINITIONS.find((t) => t.id === id) || MEMBERSHIP_TIER_DEFINITIONS[0];
}

/** Maps legacy + new storage values to canonical tier id. */
export function normalizeMembershipTierKey(value) {
  const v = String(value || "").toLowerCase().trim();
  if (v === "access" || v === "app_access") return MEMBERSHIP_TIER_KEYS.ACCESS;
  if (v === "member" || v === "member_active" || v === "active") return MEMBERSHIP_TIER_KEYS.MEMBER;
  if (v === "sponsor") return MEMBERSHIP_TIER_KEYS.SPONSOR;
  if (v === "none" || v === "guest" || v === "" || v === "free") return MEMBERSHIP_TIER_KEYS.NONE;
  if (v === "supporter" || v === "support") return MEMBERSHIP_TIER_KEYS.SUPPORT;
  if (v === "demo") return MEMBERSHIP_TIER_KEYS.MEMBER;
  return MEMBERSHIP_TIER_KEYS.NONE;
}

/** Design-system chip modifier for profile/header membership badges. */
export function membershipBadgeChipClass(tierKey, isMember = false) {
  const tier = normalizeMembershipTierKey(tierKey);
  if (
    isMember
    || tier === MEMBERSHIP_TIER_KEYS.ACCESS
    || tier === MEMBERSHIP_TIER_KEYS.MEMBER
    || tier === MEMBERSHIP_TIER_KEYS.SPONSOR
  ) {
    return "ds-chip--emphasis";
  }
  return "ds-chip--accent";
}
