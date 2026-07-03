import { MISSION_PARTNER_TIERS } from "@/features/sponsors/data/sponsorTiers";
import {
  PODCAST_SPONSOR_TIERS,
  SPONSOR_PROGRAM_TYPE_PODCAST,
} from "@/features/sponsors/data/podcastSponsorTiers";

/** All six application packages: 3 mission partners + 3 podcast sponsors. */
export const ALL_SPONSOR_PACKAGE_TIERS = [...MISSION_PARTNER_TIERS, ...PODCAST_SPONSOR_TIERS];

export function getSponsorPackageById(tierId, tiers = ALL_SPONSOR_PACKAGE_TIERS) {
  const list = Array.isArray(tiers) && tiers.length ? tiers : ALL_SPONSOR_PACKAGE_TIERS;
  return list.find((tier) => tier.id === tierId) || MISSION_PARTNER_TIERS[0];
}

export function isPodcastSponsorPackage(tier) {
  return tier?.programType === SPONSOR_PROGRAM_TYPE_PODCAST;
}

export function isKnownSponsorPackageId(tierId) {
  return ALL_SPONSOR_PACKAGE_TIERS.some((tier) => tier.id === tierId);
}
