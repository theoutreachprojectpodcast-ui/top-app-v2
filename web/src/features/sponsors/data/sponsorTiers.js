export const SPONSOR_FAMILY = {
  SUPPORT: "support_sponsor",
  INTEGRATED: "integrated_sponsorship",
};

export const SPONSOR_TIERS = [
  {
    id: "support-1000",
    family: SPONSOR_FAMILY.SUPPORT,
    familyLabel: "Support Sponsor Tiers",
    name: "Support Sponsor",
    subLabel: "Community Support Sponsor",
    amount: 1000,
    placements: [
      "Website sponsor listing",
      "One digital sponsor acknowledgement",
      "Community announcement inclusion",
      "Minimal social support",
    ],
    spotlight: "Ideal for mission-aligned brands entering sponsorship.",
  },
  {
    id: "support-2500",
    family: SPONSOR_FAMILY.SUPPORT,
    familyLabel: "Support Sponsor Tiers",
    name: "Support Sponsor",
    subLabel: "Featured Support Sponsor",
    amount: 2500,
    placements: [
      "Enhanced website placement",
      "Featured Partner Banner rotation",
      "Limited podcast or YouTube mention",
      "Expanded social inclusion",
    ],
    spotlight: "Balanced visibility across website and content touchpoints.",
  },
  {
    id: "support-5000",
    family: SPONSOR_FAMILY.SUPPORT,
    familyLabel: "Support Sponsor Tiers",
    name: "Support Sponsor",
    subLabel: "Premier Support Sponsor",
    amount: 5000,
    placements: [
      "Homepage sponsor callout panel",
      "Recurring sponsor highlight opportunities",
      "Website + content ecosystem visibility",
      "Strong social and digital support",
    ],
    spotlight: "For sponsors seeking stronger recurring exposure.",
  },
  {
    id: "integrated-15000-basic",
    family: SPONSOR_FAMILY.INTEGRATED,
    familyLabel: "Integrated Sponsorship Tiers",
    name: "Basic Sponsor",
    amount: 15000,
    placements: [
      "Integrated website placement",
      "Recurring sponsor mention opportunities",
      "YouTube Episode Partner Mention",
      "Podcast Sponsor Spotlight",
      "Multiple social posts",
    ],
    spotlight: "A full integrated entry package across core channels.",
  },
  {
    id: "integrated-20000-support",
    family: SPONSOR_FAMILY.INTEGRATED,
    familyLabel: "Integrated Sponsorship Tiers",
    name: "Support Sponsor",
    amount: 20000,
    placements: [
      "Prominent website and digital placement",
      "Recurring podcast support mention",
      "Elevated YouTube and description placement",
      "Community announcement feature",
      "Expanded cross-channel support package",
    ],
    spotlight: "Elevated visibility with stronger mission-facing integration.",
  },
  {
    id: "integrated-25000-mission",
    family: SPONSOR_FAMILY.INTEGRATED,
    familyLabel: "Integrated Sponsorship Tiers",
    name: "Mission Sponsor",
    amount: 25000,
    placements: [
      "Top sponsor visibility across ecosystem",
      "Homepage Mission Partner Placement",
      "High-frequency podcast + YouTube acknowledgements",
      "Sponsor spotlight segment opportunities",
      "Priority featured callouts and social/media inclusion",
    ],
    spotlight: "Highest-tier mission-aligned sponsor partnership.",
  },
];

export const SPONSOR_FAMILY_COPY = {
  [SPONSOR_FAMILY.SUPPORT]:
    "Lighter-weight sponsorship options for brands supporting the mission with focused visibility.",
  [SPONSOR_FAMILY.INTEGRATED]:
    "Premium integrated sponsorships designed for stronger recurring presence across The Outreach Project ecosystem.",
};

export function formatUsd(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function getTierById(tierId) {
  return SPONSOR_TIERS.find((tier) => tier.id === tierId) || SPONSOR_TIERS[0];
}
