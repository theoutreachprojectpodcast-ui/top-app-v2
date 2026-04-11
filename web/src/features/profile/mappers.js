import { defaultProfile } from "@/lib/utils";
import {
  getMembershipTierDefinition,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

/** Extended profile fields stored locally (and merged client-side with Supabase core fields). */
const PROFILE_EXTENSION_KEYS = [
  "identityRole",
  "missionStatement",
  "organizationAffiliation",
  "serviceBackground",
  "city",
  "state",
  "causes",
  "skills",
  "volunteerInterests",
  "supportInterests",
  "contributionSummary",
];

function extensionDefaults() {
  return Object.fromEntries(PROFILE_EXTENSION_KEYS.map((k) => [k, ""]));
}

function readExtensions(source = {}) {
  const out = extensionDefaults();
  for (const key of PROFILE_EXTENSION_KEYS) {
    out[key] = String(source[key] ?? "").trim();
  }
  return out;
}

export function normalizeMembershipStatus(value) {
  return normalizeMembershipTierKey(value);
}

export function profileFromLegacy(localProfile = {}) {
  const first = String(localProfile.firstName || "").trim();
  const last = String(localProfile.lastName || "").trim();
  const legacyName = String(localProfile.name || "").trim();
  const isPlaceholderLegacyName = /^(welcome\s*back\.?|supporter|your\s+name)$/i.test(legacyName);
  const [legacyFirst = "", ...legacyRest] = legacyName.split(/\s+/).filter(Boolean);

  return {
    firstName: first || (!isPlaceholderLegacyName && legacyFirst ? legacyFirst : ""),
    lastName: last || (!isPlaceholderLegacyName ? legacyRest.join(" ") : ""),
    email: String(localProfile.email || "").trim(),
    membershipStatus: normalizeMembershipStatus(localProfile.membershipStatus || localProfile.tier),
    banner: String(localProfile.banner || "Hi, I’m Andy").trim(),
    avatarUrl: String(localProfile.photoDataUrl || localProfile.avatarUrl || "").trim(),
    theme: String(localProfile.theme || "clean").trim() || "clean",
    savedOrgEins: Array.isArray(localProfile.savedOrgEins) ? localProfile.savedOrgEins : [],
    ...readExtensions(localProfile),
  };
}

export function createInitialProfile() {
  return {
    ...profileFromLegacy(defaultProfile()),
    profileRecordId: "",
    displayName: "",
    bio: "",
    membershipTier: "free",
    membershipBillingStatus: "none",
    membershipSource: "manual",
    onboardingCompleted: true,
    platformRole: "user",
    accountIntent: "",
    onboardingStatus: "not_started",
    sponsorOrgName: "",
    sponsorWebsite: "",
    sponsorIntentSummary: "",
    sponsorApplicationNotes: "",
    sponsorOnboardingPath: "",
    sponsorApplicationStatus: "",
    onboardingCurrentStep: "",
    stripeCustomerIdSet: false,
    stripeSubscriptionIdSet: false,
    podcastSponsorLastTierId: "",
    podcastSponsorLastCheckoutAt: "",
    podcastSponsorLastSessionId: "",
  };
}

export function toLocalStorageProfile(profile) {
  const t = normalizeMembershipStatus(profile.membershipStatus);
  const legacyTier = t === "member" ? "member" : "supporter";
  return {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    tier: legacyTier,
    membershipStatus: profile.membershipStatus,
    firstName: profile.firstName,
    lastName: profile.lastName,
    banner: profile.banner,
    photoDataUrl: profile.avatarUrl || "",
    avatarUrl: profile.avatarUrl || "",
    ...readExtensions(profile),
  };
}

export function toLocalShape(profile) {
  return {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    membershipStatus: normalizeMembershipStatus(profile.membershipStatus),
    banner: profile.banner || "Hi, I’m Andy",
    avatarUrl: profile.avatarUrl || "",
    theme: profile.theme || "clean",
    savedOrgEins: Array.isArray(profile.savedOrgEins) ? profile.savedOrgEins : [],
  };
}

/**
 * Merge server profile DTO (from /api/me) into full client profile shape.
 * @param {Record<string, unknown>} dto
 */
export function profileFromApiDto(dto = {}) {
  const tier = String(dto.membershipTier || "free").toLowerCase();
  const legacyStatus = normalizeMembershipStatus(tier === "free" ? "none" : tier);
  return {
    ...createInitialProfile(),
    profileRecordId: dto.profileRecordId ? String(dto.profileRecordId) : "",
    firstName: String(dto.firstName || "").trim(),
    lastName: String(dto.lastName || "").trim(),
    email: String(dto.email || "").trim(),
    displayName: String(dto.displayName || "").trim(),
    bio: String(dto.bio || "").trim(),
    avatarUrl: String(dto.avatarUrl || "").trim(),
    membershipTier: tier,
    membershipBillingStatus: String(dto.membershipBillingStatus || "none").toLowerCase(),
    membershipStatus: legacyStatus,
    onboardingCompleted: !!dto.onboardingCompleted,
    banner: String(dto.banner || "Hi, I’m Andy").trim(),
    theme: String(dto.theme || "clean").trim() || "clean",
    identityRole: String(dto.identityRole || "").trim(),
    missionStatement: String(dto.missionStatement || "").trim(),
    organizationAffiliation: String(dto.organizationAffiliation || "").trim(),
    serviceBackground: String(dto.serviceBackground || "").trim(),
    city: String(dto.city || "").trim(),
    state: String(dto.state || "").trim(),
    causes: String(dto.causes || "").trim(),
    skills: String(dto.skills || "").trim(),
    volunteerInterests: String(dto.volunteerInterests || "").trim(),
    supportInterests: String(dto.supportInterests || "").trim(),
    contributionSummary: String(dto.contributionSummary || "").trim(),
    platformRole: String(dto.platformRole || "user").trim() || "user",
    accountIntent: String(dto.accountIntent || "").trim(),
    onboardingStatus: String(dto.onboardingStatus || "not_started").trim() || "not_started",
    sponsorOrgName: String(dto.sponsorOrgName || "").trim(),
    sponsorWebsite: String(dto.sponsorWebsite || "").trim(),
    sponsorIntentSummary: String(dto.sponsorIntentSummary || "").trim(),
    sponsorApplicationNotes: String(dto.sponsorApplicationNotes || "").trim(),
    sponsorOnboardingPath: String(dto.sponsorOnboardingPath || "").trim(),
    sponsorApplicationStatus: String(dto.sponsorApplicationStatus || "").trim(),
    onboardingCurrentStep: String(dto.onboardingCurrentStep || "").trim(),
    stripeCustomerIdSet: !!dto.stripeCustomerIdSet,
    stripeSubscriptionIdSet: !!dto.stripeSubscriptionIdSet,
    membershipSource: String(dto.membershipSource || "manual").trim() || "manual",
    podcastSponsorLastTierId: String(dto.podcastSponsorLastTierId || "").trim(),
    podcastSponsorLastCheckoutAt: String(dto.podcastSponsorLastCheckoutAt || "").trim(),
    podcastSponsorLastSessionId: String(dto.podcastSponsorLastSessionId || "").trim(),
  };
}

export function getMembershipMeta(status) {
  const normalized = normalizeMembershipStatus(status);
  const def = getMembershipTierDefinition(normalized);
  const isMember = def.isMember;
  return {
    status: normalized,
    isMember,
    label: def.label,
    hint: def.hint,
    benefits: def.benefits,
    cta: isMember ? "Manage membership" : "Upgrade",
  };
}
