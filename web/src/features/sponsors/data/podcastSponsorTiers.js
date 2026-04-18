/**
 * Podcast-only sponsor tiers (Podcast hub pages only).
 * Placement and benefit bullets should be reconciled with reference image IMG_6031.jpg when that asset is available in-repo.
 */
import { formatUsd } from "@/features/sponsors/data/sponsorTiers";

export const SPONSOR_PROGRAM_TYPE_PODCAST = "podcast";

export const PODCAST_PLACEMENT_OPTIONS = [
  "Episode acknowledgements",
  "Show notes / description",
  "Podcast page sponsor presence",
  "Social tied to episode releases",
  "All of the above",
];

export const SPONSOR_FAMILY_PODCAST = "podcast_sponsor";

export const PODCAST_SPONSOR_TIERS = [
  {
    id: "podcast-community-500",
    programType: SPONSOR_PROGRAM_TYPE_PODCAST,
    family: SPONSOR_FAMILY_PODCAST,
    familyLabel: "Podcast sponsors",
    name: "Community Sponsor",
    amount: 500,
    spotlight: "Visible podcast-channel entry point with episode and show-note presence.",
    fullPlacements: [
      "Verbal thank-you during one (1) podcast episode per sponsorship period",
      "Company or organization name and logo in that episode’s show notes / description",
      "Standard listing in the podcast sponsor area on The Outreach Project podcast experience",
    ],
    fullBenefits: [
      "Alignment with mission-driven storytelling for service communities",
      "Coordinated sponsor acknowledgment in a podcast-focused social touchpoint when active",
      "Optional digital acknowledgment asset for approved use on your channels",
    ],
  },
  {
    id: "podcast-impact-1000",
    programType: SPONSOR_PROGRAM_TYPE_PODCAST,
    family: SPONSOR_FAMILY_PODCAST,
    familyLabel: "Podcast sponsors",
    name: "Impact Sponsor",
    amount: 1000,
    spotlight: "Broader episode coverage with stronger show-note and on-page rotation.",
    fullPlacements: [
      "Expanded verbal acknowledgments across multiple episodes (cadence coordinated with production)",
      "Prominent logo placement in show notes and descriptions for supported episodes",
      "Priority rotation in the on-page podcast sponsor strip when inventory allows",
      "Optional short “why we support” line in show notes subject to editorial fit",
    ],
    fullBenefits: [
      "Higher visibility across the podcast content library during the sponsorship term",
      "Coordinated social mentions aligned to episode releases (frequency by tier)",
      "First consideration for select add-on opportunities when offered",
    ],
  },
  {
    id: "podcast-foundational-2500",
    programType: SPONSOR_PROGRAM_TYPE_PODCAST,
    family: SPONSOR_FAMILY_PODCAST,
    familyLabel: "Podcast sponsors",
    name: "Foundational",
    amount: 2500,
    spotlight: "Strongest default podcast package with recurring reads and featured treatment.",
    fullPlacements: [
      "Recurring host-read acknowledgement package across the sponsorship term (frequency by agreement)",
      "Featured foundational sponsor treatment in show notes and selected metadata where format allows",
      "Top placement in podcast sponsor surfaces and consideration for episode-specific integrations where appropriate",
      "Quarterly alignment touchpoint for messaging themes when scheduling permits",
    ],
    fullBenefits: [
      "Strongest standard podcast-channel presence prior to custom partnerships",
      "Deeper collaboration on approved talking points and mission tie-ins",
      "Recognition as a foundational supporter in select campaign moments as agreed in onboarding",
    ],
  },
];

export { formatUsd };

export function getPodcastTierById(tierId) {
  return PODCAST_SPONSOR_TIERS.find((tier) => tier.id === tierId) || PODCAST_SPONSOR_TIERS[0];
}
