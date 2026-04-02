import { defaultProfile } from "@/lib/utils";

export function normalizeMembershipStatus(value) {
  const normalized = String(value || "supporter").toLowerCase().trim();
  if (normalized === "member") return "member";
  if (normalized === "demo") return "demo";
  return "supporter";
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
    banner: String(localProfile.banner || "How can we assist you today?").trim(),
    avatarUrl: String(localProfile.photoDataUrl || localProfile.avatarUrl || "").trim(),
    theme: String(localProfile.theme || "clean").trim() || "clean",
    savedOrgEins: Array.isArray(localProfile.savedOrgEins) ? localProfile.savedOrgEins : [],
  };
}

export function createInitialProfile() {
  return profileFromLegacy(defaultProfile());
}

export function toLocalStorageProfile(profile) {
  return {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    tier: profile.membershipStatus === "member" ? "member" : "supporter",
    membershipStatus: profile.membershipStatus,
    firstName: profile.firstName,
    lastName: profile.lastName,
    banner: profile.banner,
    photoDataUrl: profile.avatarUrl || "",
    avatarUrl: profile.avatarUrl || "",
  };
}

export function toLocalShape(profile) {
  return {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    email: profile.email || "",
    membershipStatus: normalizeMembershipStatus(profile.membershipStatus),
    banner: profile.banner || "How can we assist you today?",
    avatarUrl: profile.avatarUrl || "",
    theme: profile.theme || "clean",
    savedOrgEins: Array.isArray(profile.savedOrgEins) ? profile.savedOrgEins : [],
  };
}

export function getMembershipMeta(status) {
  const normalized = normalizeMembershipStatus(status);
  if (normalized === "member") {
    return {
      status: normalized,
      isMember: true,
      label: "Member Active",
      hint: "You have full access to member-only areas and saved organizations.",
      cta: "Manage membership",
    };
  }
  if (normalized === "demo") {
    return {
      status: normalized,
      isMember: false,
      label: "Demo Member",
      hint: "Demo mode enabled. Upgrade to activate full member benefits.",
      cta: "Upgrade to full member",
    };
  }
  return {
    status: "supporter",
    isMember: false,
    label: "Supporter Access",
    hint: "Upgrade to unlock member-only sponsors, community access, and saved resources.",
    cta: "Become a member",
  };
}
