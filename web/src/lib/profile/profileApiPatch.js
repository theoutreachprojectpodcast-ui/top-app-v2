/**
 * Client profile shape → JSON body for `PATCH /api/me/profile`.
 * @param {Record<string, unknown>} p
 */
export function profileToApiPatch(p) {
  const patch = {
    firstName: p.firstName,
    lastName: p.lastName,
    displayName: p.displayName || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
    email: p.email,
    bio: p.bio,
    banner: p.banner,
    theme: p.theme,
    phoneNumber: p.phoneNumber,
    postalCode: p.postalCode,
    preferredContactMethod: p.preferredContactMethod,
    notificationPreferences: Array.isArray(p.notificationPreferences) ? p.notificationPreferences : undefined,
    identitySegment: p.identitySegment,
    jobTitle: p.jobTitle,
    reasonForJoining: p.reasonForJoining,
    supportNeeds: p.supportNeeds,
    communities: p.communities,
    contributionInterests:
      p.contributionInterests && typeof p.contributionInterests === "object" ? p.contributionInterests : undefined,
    preferredContributionContact: p.preferredContributionContact,
    identityRole: p.identityRole,
    missionStatement: p.missionStatement,
    organizationAffiliation: p.organizationAffiliation,
    serviceBackground: p.serviceBackground,
    city: p.city,
    state: p.state,
    causes: p.causes,
    skills: p.skills,
    volunteerInterests: p.volunteerInterests,
    supportInterests: p.supportInterests,
    contributionSummary: p.contributionSummary,
    sponsorOrgName: p.sponsorOrgName,
    sponsorWebsite: p.sponsorWebsite,
    sponsorIntentSummary: p.sponsorIntentSummary,
    sponsorApplicationNotes: p.sponsorApplicationNotes,
    sponsorOnboardingPath: p.sponsorOnboardingPath,
    sponsorApplicationStatus: p.sponsorApplicationStatus,
    onboardingCurrentStep: p.onboardingCurrentStep,
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
