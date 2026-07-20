import { MAIN_APP_SPONSOR_TIERS, MISSION_PARTNER_TIERS } from "@/features/sponsors/data/sponsorTiers";
import {
  PODCAST_SPONSOR_TIERS,
  SPONSOR_PROGRAM_TYPE_PODCAST,
} from "@/features/sponsors/data/podcastSponsorTiers";

/** Main app sponsors hub: mission partners, foundational, and impact. */
export const MAIN_APP_SPONSOR_PACKAGE_TIERS = MAIN_APP_SPONSOR_TIERS;

/** Podcast hub only — Community, Impact, and Foundational podcast packages. */
export const PODCAST_SPONSOR_PACKAGE_TIERS = PODCAST_SPONSOR_TIERS;

/** @deprecated Prefer MAIN_APP or PODCAST package lists for scoped flows. */
export const ALL_SPONSOR_PACKAGE_TIERS = [...MAIN_APP_SPONSOR_PACKAGE_TIERS, ...PODCAST_SPONSOR_PACKAGE_TIERS];

export function getSponsorPackageById(tierId, tiers = MAIN_APP_SPONSOR_PACKAGE_TIERS) {
  const list = Array.isArray(tiers) && tiers.length ? tiers : MAIN_APP_SPONSOR_PACKAGE_TIERS;
  return list.find((tier) => tier.id === tierId) || MISSION_PARTNER_TIERS[0];
}

export function isPodcastSponsorPackage(tier) {
  return tier?.programType === SPONSOR_PROGRAM_TYPE_PODCAST;
}

export function isKnownSponsorPackageId(tierId) {
  return ALL_SPONSOR_PACKAGE_TIERS.some((tier) => tier.id === tierId);
}

export function isKnownMainAppSponsorPackageId(tierId) {
  return MAIN_APP_SPONSOR_PACKAGE_TIERS.some((tier) => tier.id === tierId);
}

export function isKnownPodcastSponsorPackageId(tierId) {
  return PODCAST_SPONSOR_PACKAGE_TIERS.some((tier) => tier.id === tierId);
}
