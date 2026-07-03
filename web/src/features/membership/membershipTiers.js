/**
 * Membership domain — tier definitions for UI and billing/entitlements.
 * Storage: profile.membershipStatus uses normalized keys from normalizeMembershipTierKey().
 *
 * User billing offers Support Membership ($0.99/yr) and Pro ($5.99/yr) only.
 * Legacy `access` tier remains in DB for existing subscribers.
 */

/** Advanced optional tier — Stripe `STRIPE_PRICE_SUPPORT_YEARLY` (fallback: monthly / legacy access yearly). */
export const SUPPORT_MEMBERSHIP_DISPLAY_NAME = "Support Membership";
export const SUPPORT_MEMBERSHIP_PRICE_LABEL = "$0.99/yr";

/** Pro tier — Stripe `STRIPE_PRICE_PRO_YEARLY` (fallback: monthly). Stored as `member` in DB. */
export const PRO_MEMBERSHIP_DISPLAY_NAME = "Pro Membership";
export const PRO_MEMBERSHIP_PRICE_LABEL = "$5.99/yr";

/** @deprecated Legacy app-access product label — use Support Membership for new checkouts. */
export const APP_ACCESS_MEMBERSHIP_DISPLAY_NAME = SUPPORT_MEMBERSHIP_DISPLAY_NAME;
/** @deprecated */
export const APP_ACCESS_MEMBERSHIP_PRICE_LABEL = SUPPORT_MEMBERSHIP_PRICE_LABEL;

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
      "Sign in and choose Support or Pro to access the platform",
    ],
    isMember: false,
    hint: "Support Membership ($0.99/year) unlocks the nonprofit directory and saved organizations.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SUPPORT,
    label: SUPPORT_MEMBERSHIP_DISPLAY_NAME,
    shortLabel: "Support",
    priceLabel: SUPPORT_MEMBERSHIP_PRICE_LABEL,
    benefits: [
      "Nonprofit directory search and exploration",
      "Save favorite nonprofits to your profile",
      "Podcast episodes, guests, and guest applications",
      "Upgrade to Pro for exclusive content and sponsor opportunities",
    ],
    isMember: false,
    hint: "Entry-level paid membership — billed annually at $0.99/year.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.MEMBER,
    label: PRO_MEMBERSHIP_DISPLAY_NAME,
    shortLabel: "Pro",
    priceLabel: PRO_MEMBERSHIP_PRICE_LABEL,
    benefits: [
      "Everything in Support Membership",
      "Create and submit community posts",
      "Pro-exclusive podcast content (YouTube playlist integration)",
      "Podcast sponsor opportunities",
      "Trusted resource discounts and partner offers",
      "All current and future Pro-only features",
    ],
    isMember: true,
    hint: "Premium membership — billed annually at $5.99/year.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.ACCESS,
    label: "App Access (legacy)",
    shortLabel: "Access",
    priceLabel: SUPPORT_MEMBERSHIP_PRICE_LABEL,
    legacy: true,
    benefits: ["Legacy annual access — same platform features as Support"],
    isMember: true,
    hint: "Existing subscribers keep access; new members choose Support Membership.",
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
