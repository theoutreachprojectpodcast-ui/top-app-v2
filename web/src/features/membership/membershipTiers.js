/**
 * Membership domain — tier definitions for UI and billing/entitlements.
 * Storage: profile.membershipStatus uses normalized keys from normalizeMembershipTierKey().
 *
 * User billing offers Pro Membership ($5.99/yr) only.
 * Legacy `support` / `access` tiers remain in DB for existing subscribers (display + upgrade).
 */

/** Display name when Support is re-enabled via admin feature flag. */
export const SUPPORT_MEMBERSHIP_DISPLAY_NAME = "Support Membership";
/** @deprecated Historical Support price — purchasable only when feature flag is on. */
export const SUPPORT_MEMBERSHIP_PRICE_LABEL = "$0.99/yr";

/** Pro tier — Stripe `STRIPE_PRICE_PRO_YEARLY` (fallback: monthly). Stored as `member` in DB. */
export const PRO_MEMBERSHIP_DISPLAY_NAME = "Pro Membership";
export const PRO_MEMBERSHIP_PRICE_LABEL = "$5.99/yr";

/** @deprecated Legacy app-access product — retired with Support. */
export const APP_ACCESS_MEMBERSHIP_DISPLAY_NAME = PRO_MEMBERSHIP_DISPLAY_NAME;
/** @deprecated */
export const APP_ACCESS_MEMBERSHIP_PRICE_LABEL = PRO_MEMBERSHIP_PRICE_LABEL;

export const MEMBERSHIP_TIER_KEYS = {
  NONE: "none",
  ACCESS: "access",
  SUPPORT: "support",
  SPONSOR: "sponsor",
  MEMBER: "member",
};

/** @typedef {{ id: string, label: string, shortLabel: string, benefits: string[], isMember: boolean, hint: string, priceLabel?: string, advancedUpgrade?: boolean, legacy?: boolean, internal?: boolean }} MembershipTierDefinition */

/** @type {MembershipTierDefinition[]} */
export const MEMBERSHIP_TIER_DEFINITIONS = [
  {
    id: MEMBERSHIP_TIER_KEYS.NONE,
    label: "No membership",
    shortLabel: "Free",
    benefits: [
      "Sign in and subscribe to Pro Membership to access the platform",
    ],
    isMember: false,
    hint: "Pro Membership ($5.99/year) unlocks the full platform.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SUPPORT,
    label: `${SUPPORT_MEMBERSHIP_DISPLAY_NAME} (legacy)`,
    shortLabel: "Support",
    priceLabel: SUPPORT_MEMBERSHIP_PRICE_LABEL,
    legacy: true,
    benefits: [
      "Legacy plan — no longer offered for new members",
      "Upgrade to Pro for full platform access",
    ],
    isMember: false,
    hint: "Retired product. Existing subscribers should upgrade to Pro Membership.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.MEMBER,
    label: PRO_MEMBERSHIP_DISPLAY_NAME,
    shortLabel: "Pro",
    priceLabel: PRO_MEMBERSHIP_PRICE_LABEL,
    benefits: [
      "Nonprofit directory search and exploration",
      "Save favorite nonprofits to your profile",
      "Podcast episodes, guests, and guest applications",
      "Create and submit community posts",
      "Pro-exclusive podcast content",
      "Podcast sponsor opportunities",
      "Trusted resource discounts and partner offers",
      "All current and future Pro features",
    ],
    isMember: true,
    hint: "Full platform membership — billed annually at $5.99/year.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.ACCESS,
    label: "App Access (legacy)",
    shortLabel: "Access",
    priceLabel: SUPPORT_MEMBERSHIP_PRICE_LABEL,
    legacy: true,
    benefits: ["Legacy annual access — upgrade to Pro Membership"],
    isMember: false,
    hint: "Existing subscribers keep billing history; new members choose Pro.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SPONSOR,
    label: "Sponsor Membership",
    shortLabel: "Sponsor",
    internal: true,
    benefits: [
      "Internal sponsor role assigned after partnership onboarding",
    ],
    isMember: false,
    hint: "Not available in profile billing — see Sponsor opportunities on the Sponsors page.",
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
  if (v === "member" || v === "member_active" || v === "active" || v === "pro") return MEMBERSHIP_TIER_KEYS.MEMBER;
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
    || tier === MEMBERSHIP_TIER_KEYS.SUPPORT
    || tier === MEMBERSHIP_TIER_KEYS.MEMBER
    || tier === MEMBERSHIP_TIER_KEYS.SPONSOR
  ) {
    return "ds-chip--emphasis";
  }
  return "ds-chip--accent";
}
