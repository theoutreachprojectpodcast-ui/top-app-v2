import { EMPTY_PROFILE_AVATAR_URL } from "@/lib/avatarFallback";
import { normalizePublicAccountIntent } from "@/lib/account/accountModel";

/** @typedef {{ id: string, label: string, tier: 'required' | 'recommended', editFocus: string | null, actionKind?: string }} CompletenessItemDef */

const IDENTITY_SEGMENTS_ORG = new Set(["organization_representative", "sponsor", "resource_partner"]);
const IDENTITY_SEGMENTS_SERVICE = new Set(["veteran", "first_responder"]);

export const IDENTITY_SEGMENT_OPTIONS = [
  { value: "veteran", label: "Veteran" },
  { value: "first_responder", label: "First responder" },
  { value: "family_member", label: "Family member" },
  { value: "supporter", label: "Supporter" },
  { value: "organization_representative", label: "Organization representative" },
  { value: "sponsor", label: "Sponsor" },
  { value: "resource_partner", label: "Resource partner" },
];

export const PREFERRED_CONTACT_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "SMS" },
  { value: "in_app", label: "In-app messages" },
];

export const CONTRIBUTION_INTEREST_KEYS = [
  ["volunteer", "Volunteer"],
  ["sponsorInterest", "Sponsor / fund"],
  ["resourceProvider", "Resource provider"],
  ["podcastGuest", "Podcast guest"],
  ["eventSupport", "Event support"],
  ["donation", "Donation / financial support"],
  ["storySharing", "Share my story"],
  ["mentor", "Mentor / peer support"],
];

/** @param {Record<string, unknown> | null | undefined} p */
function hasCustomPhoto(p) {
  const u = String(p?.avatarUrl || "").trim();
  if (!u) return false;
  if (u === EMPTY_PROFILE_AVATAR_URL) return false;
  if (u.endsWith("/avatar-placeholder.svg")) return false;
  return true;
}

/** @param {Record<string, unknown> | null | undefined} p */
function readSegment(p) {
  return String(p?.identitySegment || "").trim().toLowerCase();
}

/** @param {unknown} raw */
export function normalizeContributionInterests(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [k] of CONTRIBUTION_INTEREST_KEYS) {
    out[k] = Boolean(raw[k]);
  }
  return out;
}

/** @param {Record<string, unknown> | null | undefined} p */
function hasContributionPreferenceSignal(p) {
  const ci = normalizeContributionInterests(p?.contributionInterests);
  if (Object.values(ci).some(Boolean)) return true;
  if (String(p?.volunteerInterests || "").trim()) return true;
  if (String(p?.contributionSummary || "").trim()) return true;
  if (String(p?.skills || "").trim()) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} p — client/API profile shape
 * @returns {CompletenessItemDef[]}
 */
function buildRequiredDefs(p) {
  const seg = readSegment(p);
  /** @type {CompletenessItemDef[]} */
  const defs = [
    {
      id: "firstName",
      label: "First name",
      tier: "required",
      editFocus: "name",
    },
    {
      id: "lastName",
      label: "Last name",
      tier: "required",
      editFocus: "name",
    },
    {
      id: "displayName",
      label: "Display name",
      tier: "required",
      editFocus: "displayName",
    },
    {
      id: "email",
      label: "Email",
      tier: "required",
      editFocus: "email",
    },
    {
      id: "identitySegment",
      label: "How you identify with this community",
      tier: "required",
      editFocus: "identitySegment",
    },
    {
      id: "state",
      label: "State / region",
      tier: "required",
      editFocus: "location",
    },
    {
      id: "reasonForJoining",
      label: "Reason for joining The Outreach Project",
      tier: "required",
      editFocus: "reasonForJoining",
    },
    {
      id: "preferredContactMethod",
      label: "Preferred contact method",
      tier: "required",
      editFocus: "preferences",
    },
  ];

  if (IDENTITY_SEGMENTS_SERVICE.has(seg)) {
    defs.push({
      id: "serviceBackground",
      label: "Branch or service affiliation",
      tier: "required",
      editFocus: "serviceBackground",
    });
  }
  if (IDENTITY_SEGMENTS_ORG.has(seg)) {
    defs.push({
      id: "organizationName",
      label: "Organization name",
      tier: "required",
      editFocus: "organizationName",
    });
  }
  return defs;
}

/**
 * @param {Record<string, unknown>} p
 * @param {CompletenessItemDef} d
 */
function evalRequiredDone(p, d) {
  switch (d.id) {
    case "firstName":
      return Boolean(String(p.firstName || "").trim());
    case "lastName":
      return Boolean(String(p.lastName || "").trim());
    case "displayName":
      return Boolean(String(p.displayName || "").trim());
    case "email":
      return Boolean(String(p.email || "").trim());
    case "identitySegment":
      return Boolean(readSegment(p));
    case "state":
      return Boolean(String(p.state || "").trim());
    case "reasonForJoining":
      return Boolean(String(p.reasonForJoining || "").trim());
    case "preferredContactMethod":
      return Boolean(String(p.preferredContactMethod || "").trim());
    case "serviceBackground":
      return Boolean(String(p.serviceBackground || "").trim());
    case "organizationName":
      return Boolean(String(p.organizationAffiliation || "").trim());
    default:
      return false;
  }
}

/**
 * @param {Record<string, unknown>} p
 * @returns {CompletenessItemDef[]}
 */
function buildRecommendedDefs() {
  return [
    { id: "phone", label: "Phone number", tier: "recommended", editFocus: "phone" },
    { id: "avatar", label: "Profile photo", tier: "recommended", editFocus: "avatar" },
    { id: "bio", label: "Short bio", tier: "recommended", editFocus: "about" },
    { id: "interests", label: "Interests / categories you care about", tier: "recommended", editFocus: "interests" },
    { id: "supportNeeds", label: "Support needs", tier: "recommended", editFocus: "supportNeeds" },
    { id: "contribution", label: "Contribution preferences", tier: "recommended", editFocus: "contribution" },
    { id: "communities", label: "Communities you identify with", tier: "recommended", editFocus: "communities" },
    { id: "jobTitle", label: "Role / title", tier: "recommended", editFocus: "jobTitle" },
  ];
}

/**
 * @param {Record<string, unknown>} p
 * @param {CompletenessItemDef} d
 */
function evalRecommendedDone(p, d) {
  switch (d.id) {
    case "phone":
      return Boolean(String(p.phoneNumber || "").trim());
    case "avatar":
      return hasCustomPhoto(p);
    case "bio":
      return Boolean(String(p.bio || "").trim());
    case "interests":
      return Boolean(String(p.causes || "").trim());
    case "supportNeeds":
      return Boolean(String(p.supportNeeds || "").trim());
    case "contribution":
      return hasContributionPreferenceSignal(p);
    case "communities":
      return Boolean(String(p.communities || "").trim());
    case "jobTitle":
      return Boolean(String(p.jobTitle || "").trim());
    default:
      return false;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 */
export function mergeProfileWithWorkOSUserForCompleteness(profile, options = {}) {
  const p = profile && typeof profile === "object" ? { ...profile } : {};
  const w = options.workOSUser && typeof options.workOSUser === "object" ? options.workOSUser : null;
  if (!w) return p;
  if (!String(p.email || "").trim() && w.email) p.email = w.email;
  if (!String(p.firstName || "").trim() && w.firstName) p.firstName = w.firstName;
  if (!String(p.lastName || "").trim() && w.lastName) p.lastName = w.lastName;
  const derived = [w.firstName, w.lastName].filter(Boolean).join(" ").trim();
  if (derived && !String(p.displayName || "").trim()) p.displayName = derived;
  return p;
}

/**
 * Account setup + enhancement evaluation (excludes membership billing alignment).
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 */
export function evaluateAccountProfileCompleteness(profile, options = {}) {
  const p = mergeProfileWithWorkOSUserForCompleteness(profile, options);
  const requiredDefs = buildRequiredDefs(p);
  const recommendedDefs = buildRecommendedDefs();

  const requiredItems = requiredDefs.map((d) => ({
    ...d,
    done: evalRequiredDone(p, d),
    actionKind: "profile-edit",
  }));
  const recommendedItems = recommendedDefs.map((d) => ({
    ...d,
    done: evalRecommendedDone(p, d),
    actionKind: "profile-edit",
  }));

  const allItems = [...requiredItems, ...recommendedItems];
  const completed = allItems.filter((x) => x.done).length;
  const total = allItems.length;
  const percentage = total ? Math.round((completed / total) * 100) : 100;

  const requiredMissing = requiredItems.filter((x) => !x.done).map((x) => x.id);
  const recommendedMissing = recommendedItems.filter((x) => !x.done).map((x) => x.id);

  const requiredAllMet = requiredMissing.length === 0;
  const fullyComplete = requiredAllMet && recommendedMissing.length === 0;

  return {
    requiredItems,
    recommendedItems,
    allItems,
    completed,
    total,
    percentage,
    requiredMissing,
    recommendedMissing,
    requiredAllMet,
    fullyComplete,
    missingFieldIds: [...requiredMissing, ...recommendedMissing],
  };
}

/** Billing tier matches saved intent (same as legacy completion). */
function membershipMatchesSavedIntent(p) {
  const intent = normalizePublicAccountIntent(p?.accountIntent);
  const tier = String(p?.membershipTier || "free").toLowerCase();
  const billing = String(p?.membershipBillingStatus || "none").toLowerCase();
  if (!intent) return true;
  if (intent === "free_user") return tier === "free";
  if (intent === "support_user") return tier === "support" && billing === "active";
  if (intent === "member_user") return tier === "member" && billing === "active";
  if (intent === "sponsor_user") {
    const os = String(p?.onboardingStatus || "").toLowerCase();
    const sp = String(p?.sponsorOnboardingPath || "").toLowerCase();
    if (os === "needs_review" || sp === "application") return true;
    return tier === "sponsor" && billing === "active";
  }
  return true;
}

/**
 * Saved participation path on profile.
 * @param {Record<string, unknown> | null | undefined} p
 */
function hasSavedAccountIntent(p) {
  if (Boolean(p?.onboardingCompleted)) return true;
  return Boolean(normalizePublicAccountIntent(p?.accountIntent));
}

/**
 * Full profile completion for UI: account fields + participation + membership + wizard flag.
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 */
export function evaluateFullProfileCompletion(profile, options = {}) {
  const account = evaluateAccountProfileCompleteness(profile, options);
  const p = mergeProfileWithWorkOSUserForCompleteness(profile, options);

  const membershipStep = {
    id: "membership",
    label: "Align membership billing with your chosen plan",
    shortLabel: "Membership",
    tier: "required",
    done: membershipMatchesSavedIntent(p),
    actionKind: "membership",
    editFocus: null,
  };

  const intentStep = {
    id: "account_intent",
    label: "Choose how you plan to participate",
    shortLabel: "Participation path",
    tier: "required",
    done: hasSavedAccountIntent(p),
    actionKind: "onboarding",
    editFocus: null,
  };

  const wizardStep = {
    id: "membership_onboarding",
    label: "Finish membership onboarding (checkout or free)",
    shortLabel: "Membership setup",
    tier: "required",
    done: Boolean(p?.onboardingCompleted),
    actionKind: "onboarding",
    editFocus: null,
  };

  const extraSteps = [intentStep, ...account.allItems, membershipStep, wizardStep];

  const steps = extraSteps.map((s) => ({
    id: s.id,
    label: s.label,
    shortLabel: s.shortLabel || s.label,
    done: s.done,
    actionKind: s.actionKind,
    editFocus: s.editFocus ?? null,
    tier: s.tier || "required",
  }));

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percentage = total ? Math.round((completed / total) * 100) : 100;
  const nextStep = steps.find((s) => !s.done) || null;

  const accountFullyComplete = account.fullyComplete && membershipMatchesSavedIntent(p) && hasSavedAccountIntent(p);
  const isComplete = accountFullyComplete && Boolean(p?.onboardingCompleted);

  return {
    account,
    steps,
    completed,
    total,
    percentage,
    nextStep,
    isComplete,
    /** Hide the profile completeness panel when account + enhancement are done (membership may still show elsewhere). */
    hidePanel: account.fullyComplete,
    showEnhancementOnly: account.requiredAllMet && !account.fullyComplete,
  };
}

/**
 * DB columns derived from client DTO (service role writes).
 * @param {Record<string, unknown> | null | undefined} profileDto
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 */
/**
 * @param {Record<string, unknown> | null | undefined} profileDto
 * @param {{ workOSUser?: { email?: string, firstName?: string, lastName?: string } | null }} [options]
 * @param {Record<string, unknown> | null} [existingRow] — raw Supabase row (optional) for first-time timestamps
 */
export function buildProfileCompletenessDbPatch(profileDto, options = {}, existingRow = null) {
  const ev = evaluateAccountProfileCompleteness(profileDto, options);
  const now = new Date().toISOString();
  const patch = {
    profile_completeness_percentage: Math.max(0, Math.min(100, ev.percentage)),
    profile_completeness_missing_fields: ev.missingFieldIds,
    profile_last_updated_at: now,
  };

  if (ev.requiredAllMet) {
    patch.onboarding_skipped = false;
    if (!existingRow?.account_setup_completed_at) {
      patch.account_setup_completed_at = now;
    }
  }

  return { patch, evaluation: ev };
}
