/**
 * Main app Mission Partner tiers (Outreach Project Sponsors tab only).
 * Placement and benefit bullets should be reconciled with reference image IMG_6033.jpg when that asset is available in-repo.
 */
export const SPONSOR_PROGRAM_TYPE_MAIN = "main_app";

/** Stored on sponsor_applications.sponsor_family */
export const SPONSOR_FAMILY_MISSION = "mission_partner";
export const SPONSOR_FAMILY_FOUNDATIONAL = "foundational";
export const SPONSOR_FAMILY_IMPACT = "impact";

export const MISSION_PARTNER_TIERS = [
  {
    id: "mission-supporting-7500",
    programType: SPONSOR_PROGRAM_TYPE_MAIN,
    family: SPONSOR_FAMILY_MISSION,
    familyLabel: "Mission partners",
    name: "Supporting Partner",
    amount: 7500,
    spotlight: "Trusted presence across the main digital experience with clear onboarding and stewardship.",
    fullPlacements: [
      "Mission partner listing on The Outreach Project website with standard logo treatment",
      "Inclusion in partner-focused digital announcements when those programs are active",
      "Qualified visibility in community-appropriate surfaces aligned to sponsor category and fit",
      "Entry-level integrated presence across website and discovery pathways (depth subject to editorial review)",
    ],
    fullBenefits: [
      "Association with vetted resource navigation for veterans, first responders, and families",
      "Sponsor profile eligible for the public catalog after review and asset readiness",
      "Structured onboarding with brand-fit review and placement coordination",
    ],
  },
  {
    id: "mission-growth-15000",
    programType: SPONSOR_PROGRAM_TYPE_MAIN,
    family: SPONSOR_FAMILY_MISSION,
    familyLabel: "Mission partners",
    name: "Growth Partner",
    amount: 15000,
    spotlight: "Stronger recurring visibility across website, media, and social touchpoints.",
    fullPlacements: [
      "Featured mission partner modules in higher-traffic website sections (rotation and inventory permitting)",
      "Expanded cadence of digital acknowledgements across approved channels",
      "Coordinated mentions across podcast and YouTube where format and inventory allow (separate from dedicated podcast sponsor packages)",
      "Elevated social support with milestone or launch-aligned opportunities when scheduled",
    ],
    fullBenefits: [
      "Cross-channel continuity for sustained awareness beyond a single placement",
      "Priority consideration for homepage or hero-adjacent modules when inventory allows",
      "Stewardship-style recap of delivered placements when reporting is available",
    ],
  },
  {
    id: "mission-strategic-25000",
    programType: SPONSOR_PROGRAM_TYPE_MAIN,
    family: SPONSOR_FAMILY_MISSION,
    familyLabel: "Mission partners",
    name: "Strategic Partner",
    amount: 25000,
    spotlight: "Premier mission-facing integration for brands ready to lead with the ecosystem.",
    fullPlacements: [
      "Premier mission partner positioning across the main Outreach Project website experience",
      "Highest-priority recurring acknowledgements across approved website, social, and long-form media (coordinated with inventory and editorial standards)",
      "Opportunity for co-developed impact storytelling where brand fit, compliance, and timing align",
      "Dedicated check-in rhythm for strategic alignment and placement optimization during the term",
    ],
    fullBenefits: [
      "Recognized strategic supporter status suitable for enterprise and mission-major partnerships",
      "Custom placement sequencing reviewed with your team during onboarding",
      "Highest standard stewardship tier before engaging a fully custom agreement",
    ],
  },
];

export const FOUNDATIONAL_SPONSOR_TIERS = [
  {
    id: "platform-foundational-5000",
    programType: SPONSOR_PROGRAM_TYPE_MAIN,
    family: SPONSOR_FAMILY_FOUNDATIONAL,
    familyLabel: "Foundational sponsors",
    name: "Foundational Sponsor",
    amount: 5000,
    spotlight: "Core partners that anchor trust, training, and readiness across the ecosystem.",
    fullPlacements: [
      "Foundational sponsor listing on The Outreach Project website with standard logo treatment",
      "Inclusion in partner-focused digital announcements when those programs are active",
      "Visibility in community-appropriate surfaces aligned to sponsor category and fit",
    ],
    fullBenefits: [
      "Association with vetted resource navigation for veterans, first responders, and families",
      "Sponsor profile eligible for the public catalog after review and asset readiness",
      "Structured onboarding with brand-fit review and placement coordination",
    ],
  },
];

export const IMPACT_SPONSOR_TIERS = [
  {
    id: "platform-impact-3500",
    programType: SPONSOR_PROGRAM_TYPE_MAIN,
    family: SPONSOR_FAMILY_IMPACT,
    familyLabel: "Impact sponsors",
    name: "Impact Sponsor",
    amount: 3500,
    spotlight: "Regional and program sponsors extending reach into communities and verticals.",
    fullPlacements: [
      "Impact sponsor presence across approved website and discovery modules",
      "Digital acknowledgements scaled to regional or program focus areas",
      "Qualified visibility in community-aligned surfaces when inventory allows",
    ],
    fullBenefits: [
      "Mission-connected positioning for organizations serving specific regions or causes",
      "Sponsor profile eligible for catalog listing after review",
      "Onboarding support for messaging, assets, and placement timing",
    ],
  },
];

/** Main Outreach Project sponsors hub — mission, foundational, and impact only (no podcast or community). */
export const MAIN_APP_SPONSOR_TIERS = [
  ...MISSION_PARTNER_TIERS,
  ...FOUNDATIONAL_SPONSOR_TIERS,
  ...IMPACT_SPONSOR_TIERS,
];

export const SPONSOR_TIERS = MISSION_PARTNER_TIERS;

export function formatUsd(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function getTierById(tierId, tiers = SPONSOR_TIERS) {
  const list = Array.isArray(tiers) && tiers.length ? tiers : SPONSOR_TIERS;
  return list.find((tier) => tier.id === tierId) || list[0];
}
