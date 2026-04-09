/**
 * Membership domain — tier definitions for UI and future billing/entitlements.
 * Storage: profile.membershipStatus uses normalized keys from normalizeMembershipTierKey().
 */

export const MEMBERSHIP_TIER_KEYS = {
  NONE: "none",
  SUPPORT: "support",
  SPONSOR: "sponsor",
  MEMBER: "member",
};

/** @typedef {{ id: string, label: string, shortLabel: string, benefits: string[], isMember: boolean, hint: string }} MembershipTierDefinition */

/** @type {MembershipTierDefinition[]} */
export const MEMBERSHIP_TIER_DEFINITIONS = [
  {
    id: MEMBERSHIP_TIER_KEYS.NONE,
    label: "No membership",
    shortLabel: "Browse",
    benefits: [
      "Explore the nonprofit directory and Trusted Resources listings",
      "Read community stories and partner content",
      "Contact the team via the site",
    ],
    isMember: false,
    hint: "Create a free account to save favorites and personalize your journey.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SUPPORT,
    label: "Support",
    shortLabel: "Support",
    benefits: [
      "Save favorite organizations across sessions",
      "Personal profile and tagline",
      "Newsletter-ready account identity for future updates",
    ],
    isMember: false,
    hint: "Supporter accounts keep your saves and profile in sync.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.SPONSOR,
    label: "Sponsor",
    shortLabel: "Sponsor",
    benefits: [
      "Recognition pathways aligned to sponsor packages (when activated)",
      "Priority routing for partnership inquiries",
      "Co-marketing touchpoints per executed agreement",
    ],
    isMember: false,
    hint: "Sponsor tier is assigned after sponsorship onboarding — not self-serve checkout yet.",
  },
  {
    id: MEMBERSHIP_TIER_KEYS.MEMBER,
    label: "Member Active",
    shortLabel: "Member",
    benefits: [
      "Submit community stories for moderation review",
      "Full access to member-only flows as they roll out",
      "Saved organizations and enhanced profile fields",
    ],
    isMember: true,
    hint: "Active members can participate in community submissions and member features.",
  },
];

export function getMembershipTierDefinition(tierKey) {
  const id = normalizeMembershipTierKey(tierKey);
  return MEMBERSHIP_TIER_DEFINITIONS.find((t) => t.id === id) || MEMBERSHIP_TIER_DEFINITIONS[1];
}

/** Maps legacy + new storage values to canonical tier id. */
export function normalizeMembershipTierKey(value) {
  const v = String(value || "").toLowerCase().trim();
  if (v === "member" || v === "member_active" || v === "active") return MEMBERSHIP_TIER_KEYS.MEMBER;
  if (v === "sponsor") return MEMBERSHIP_TIER_KEYS.SPONSOR;
  if (v === "none" || v === "guest" || v === "") return MEMBERSHIP_TIER_KEYS.NONE;
  if (v === "supporter" || v === "support") return MEMBERSHIP_TIER_KEYS.SUPPORT;
  if (v === "demo") return MEMBERSHIP_TIER_KEYS.MEMBER;
  return MEMBERSHIP_TIER_KEYS.SUPPORT;
}
