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
    banner: String(localProfile.banner || "").trim(),
    avatarUrl: String(localProfile.photoDataUrl || localProfile.avatarUrl || "").trim(),
    theme: String(localProfile.theme || "clean").trim() || "clean",
    colorScheme: String(localProfile.colorScheme || "").trim().toLowerCase(),
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
    phoneNumber: "",
    postalCode: "",
    preferredContactMethod: "",
    notificationPreferences: [],
    identitySegment: "",
    jobTitle: "",
    reasonForJoining: "",
    supportNeeds: "",
    communities: "",
    contributionInterests: {},
    preferredContributionContact: "",
    onboardingSkipped: false,
    profileCompletenessPercentage: null,
    profileCompletenessMissingFields: [],
    profileLastUpdatedAt: "",
    accountSetupCompletedAt: "",
    membershipTier: "free",
    membershipBillingStatus: "none",
    membershipSource: "manual",
    onboardingCompleted: true,
    platformRole: "user",
    userType: "member",
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
    colorScheme: "",
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
    colorScheme: String(profile.colorScheme || "").trim().toLowerCase(),
    ...readExtensions(profile),
  };
}

export function toLocalShape(profile) {
  return {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    membershipStatus: normalizeMembershipStatus(profile.membershipStatus),
    banner: profile.banner || "",
    avatarUrl: profile.avatarUrl || "",
    theme: profile.theme || "clean",
    colorScheme: String(profile.colorScheme || "").trim().toLowerCase(),
    savedOrgEins: Array.isArray(profile.savedOrgEins) ? profile.savedOrgEins : [],
  };
}

/**
 * When `torp_profiles` fields are empty, fill from the WorkOS session (`GET /api/me` `user`) so UI and
 * profile completion match sign-in identity without flashing incomplete name/email.
 * @param {Record<string, unknown> | null | undefined} dto
 * @param {{ email?: string, firstName?: string, lastName?: string } | null | undefined} sessionUser — `user` from `GET /api/me`
 */
export function mergeAccountEmailIntoProfileDto(dto, sessionUser) {
  const d = dto && typeof dto === "object" ? { ...dto } : {};
  const acct = String(sessionUser?.email ?? "").trim();
  if (acct && !String(d.email ?? "").trim()) {
    d.email = acct;
  }
  const fn = String(sessionUser?.firstName ?? "").trim();
  const ln = String(sessionUser?.lastName ?? "").trim();
  if (fn && !String(d.firstName ?? "").trim()) d.firstName = fn;
  if (ln && !String(d.lastName ?? "").trim()) d.lastName = ln;
  const derived = [fn, ln].filter(Boolean).join(" ").trim();
  if (derived && !String(d.displayName ?? "").trim()) {
    d.displayName = derived;
  }
  return d;
}

/**
 * Merge server profile DTO (from /api/me) into full client profile shape.
 * @param {Record<string, unknown>} dto
 */
export function profileFromApiDto(dto = {}) {
  const tier = String(dto.membershipTier || "free").toLowerCase();
  const legacyStatus = normalizeMembershipStatus(tier === "free" ? "none" : tier);
  const notif = Array.isArray(dto.notificationPreferences) ? dto.notificationPreferences : [];
  const ci = dto.contributionInterests && typeof dto.contributionInterests === "object" ? dto.contributionInterests : {};
  return {
    ...createInitialProfile(),
    profileRecordId: dto.profileRecordId ? String(dto.profileRecordId) : "",
    firstName: String(dto.firstName || "").trim(),
    lastName: String(dto.lastName || "").trim(),
    email: String(dto.email || "").trim(),
    displayName: String(dto.displayName || "").trim(),
    bio: String(dto.bio || "").trim(),
    avatarUrl: String(dto.avatarUrl || "").trim(),
    phoneNumber: String(dto.phoneNumber || "").trim(),
    postalCode: String(dto.postalCode || "").trim(),
    preferredContactMethod: String(dto.preferredContactMethod || "").trim().toLowerCase(),
    notificationPreferences: notif.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean),
    identitySegment: String(dto.identitySegment || "").trim().toLowerCase(),
    jobTitle: String(dto.jobTitle || "").trim(),
    reasonForJoining: String(dto.reasonForJoining || "").trim(),
    supportNeeds: String(dto.supportNeeds || "").trim(),
    communities: String(dto.communities || "").trim(),
    contributionInterests: { ...ci },
    preferredContributionContact: String(dto.preferredContributionContact || "").trim(),
    onboardingSkipped: !!dto.onboardingSkipped,
    profileCompletenessPercentage:
      dto.profileCompletenessPercentage != null ? Number(dto.profileCompletenessPercentage) : null,
    profileCompletenessMissingFields: Array.isArray(dto.profileCompletenessMissingFields)
      ? dto.profileCompletenessMissingFields.map((x) => String(x || "").trim()).filter(Boolean)
      : [],
    profileLastUpdatedAt: String(dto.profileLastUpdatedAt || "").trim(),
    accountSetupCompletedAt: String(dto.accountSetupCompletedAt || "").trim(),
    membershipTier: tier,
    membershipBillingStatus: String(dto.membershipBillingStatus || "none").toLowerCase(),
    membershipStatus: legacyStatus,
    onboardingCompleted: !!dto.onboardingCompleted,
    banner: String(dto.banner || "").trim(),
    theme: String(dto.theme || "clean").trim() || "clean",
    colorScheme: String(dto.colorScheme || "").trim().toLowerCase(),
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
    userType: String(dto.userType || "member").trim().toLowerCase() || "member",
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
    renewalDate: String(dto.renewalDate || "").trim(),
    billingStatus: String(dto.billingStatus || dto.membershipBillingStatus || "").trim(),
    sponsorTier: String(dto.sponsorTier || "").trim(),
    paymentMethodSummary:
      dto.paymentMethodSummary && typeof dto.paymentMethodSummary === "object" ? dto.paymentMethodSummary : null,
    subscriptionStatus: String(dto.subscriptionStatus || "").trim(),
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
