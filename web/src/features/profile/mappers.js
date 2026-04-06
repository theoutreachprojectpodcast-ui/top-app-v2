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
  return profileFromLegacy(defaultProfile());
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
