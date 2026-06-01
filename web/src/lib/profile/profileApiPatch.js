function patchStr(value) {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

/**
 * Client profile shape → JSON body for `PATCH /api/me/profile`.
 * @param {Record<string, unknown>} p
 */
export function profileToApiPatch(p) {
  const firstName = patchStr(p.firstName).trim();
  const lastName = patchStr(p.lastName).trim();
  const displayName = patchStr(p.displayName).trim() || [firstName, lastName].filter(Boolean).join(" ").trim();

  const patch = {
    firstName,
    lastName,
    displayName,
    email: patchStr(p.email).trim(),
    bio: patchStr(p.bio).trim(),
    banner: patchStr(p.banner).trim(),
    theme: patchStr(p.theme).trim(),
    phoneNumber: patchStr(p.phoneNumber).trim(),
    postalCode: patchStr(p.postalCode).trim(),
    preferredContactMethod: patchStr(p.preferredContactMethod).trim().toLowerCase(),
    notificationPreferences: Array.isArray(p.notificationPreferences) ? p.notificationPreferences : [],
    identitySegment: patchStr(p.identitySegment).trim().toLowerCase(),
    jobTitle: patchStr(p.jobTitle).trim(),
    reasonForJoining: patchStr(p.reasonForJoining).trim(),
    supportNeeds: patchStr(p.supportNeeds).trim(),
    communities: patchStr(p.communities).trim(),
    contributionInterests:
      p.contributionInterests && typeof p.contributionInterests === "object" ? p.contributionInterests : {},
    preferredContributionContact: patchStr(p.preferredContributionContact).trim(),
    identityRole: patchStr(p.identityRole).trim(),
    missionStatement: patchStr(p.missionStatement).trim(),
    organizationAffiliation: patchStr(p.organizationAffiliation).trim(),
    serviceBackground: patchStr(p.serviceBackground).trim(),
    city: patchStr(p.city).trim(),
    state: patchStr(p.state).trim(),
    causes: patchStr(p.causes).trim(),
    skills: patchStr(p.skills).trim(),
    volunteerInterests: patchStr(p.volunteerInterests).trim(),
    supportInterests: patchStr(p.supportInterests).trim(),
    contributionSummary: patchStr(p.contributionSummary).trim(),
    sponsorOrgName: patchStr(p.sponsorOrgName).trim(),
    sponsorWebsite: patchStr(p.sponsorWebsite).trim(),
    sponsorIntentSummary: patchStr(p.sponsorIntentSummary).trim(),
    sponsorApplicationNotes: patchStr(p.sponsorApplicationNotes).trim(),
    sponsorOnboardingPath: patchStr(p.sponsorOnboardingPath).trim(),
    sponsorApplicationStatus: patchStr(p.sponsorApplicationStatus).trim(),
    onboardingCurrentStep: patchStr(p.onboardingCurrentStep).trim(),
  };

  const avatar = String(p.avatarUrl || "").trim();
  if (avatar && !avatar.startsWith("data:")) {
    patch.avatarUrl = avatar;
  }

  const cs = String(p.colorScheme || "").trim().toLowerCase();
  if (cs === "light" || cs === "dark") patch.colorScheme = cs;
  if (p.accountIntent != null && String(p.accountIntent).trim()) {
    patch.accountIntent = String(p.accountIntent).trim();
  }
  if (typeof p.onboardingSkipped === "boolean") patch.onboardingSkipped = p.onboardingSkipped;
  const os = String(p.onboardingStatus || "").trim().toLowerCase();
  if (os === "in_progress") patch.onboardingStatus = os;

  return patch;
}
