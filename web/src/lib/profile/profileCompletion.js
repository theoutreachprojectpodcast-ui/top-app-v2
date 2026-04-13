import { EMPTY_PROFILE_AVATAR_URL } from "@/lib/avatarFallback";
import { normalizePublicAccountIntent } from "@/lib/account/accountModel";

/**
 * Profile completion (tORP v0.3) — **persisted Supabase `torp_profiles` only** (via `profileRowToClientDto` / client copy).
 * Does not infer completion from the WorkOS IdP session: if `email` / `first_name` / etc. are empty in the DB row,
 * the step stays incomplete until PATCH `/api/me/profile` (or onboarding) writes them.
 */

/**
 * Optional display merge for UI that shows IdP fallbacks (not used for completion %).
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ email?: string, firstName?: string, lastName?: string } | null} [workOSUser]
 */
export function mergeProfileWithWorkOSUser(profile, workOSUser) {
  const p = profile && typeof profile === "object" ? { ...profile } : {};
  const w = workOSUser && typeof workOSUser === "object" ? workOSUser : null;
  if (!w) return p;
  if (!String(p.email || "").trim() && w.email) p.email = w.email;
  if (!String(p.firstName || "").trim() && w.firstName) p.firstName = w.firstName;
  if (!String(p.lastName || "").trim() && w.lastName) p.lastName = w.lastName;
  return p;
}

/** @param {Record<string, unknown> | null | undefined} profile */
function persistedShape(profile) {
  return profile && typeof profile === "object" ? { ...profile } : {};
}

function hasCustomPhoto(p) {
  const u = String(p.avatarUrl || "").trim();
  if (!u) return false;
  if (u === EMPTY_PROFILE_AVATAR_URL) return false;
  if (u.endsWith("/avatar-placeholder.svg")) return false;
  return true;
}

/** Bio or banner column has any saved content (torp_profiles.bio / .banner). */
function hasAboutText(p) {
  return String(p.bio || "").trim().length > 0 || String(p.banner || "").trim().length > 0;
}

/** Saved `account_intent` on `torp_profiles` (onboarding path), not inferred from IdP. */
function hasSavedAccountIntent(p) {
  return Boolean(normalizePublicAccountIntent(p?.accountIntent));
}

/** Mission / role block on profile (metadata). */
function hasIdentityBasics(p) {
  return (
    Boolean(String(p?.missionStatement || "").trim()) || Boolean(String(p?.identityRole || "").trim())
  );
}

/**
 * Billing tier matches the participation path saved on the profile (Stripe / onboarding authority).
 * Until `account_intent` is set, this step stays complete so users are not blocked before choosing a path.
 */
function membershipMatchesSavedIntent(p) {
  const intent = normalizePublicAccountIntent(p?.accountIntent);
  const tier = String(p?.membershipTier || "free").toLowerCase();
  const billing = String(p?.membershipBillingStatus || "none").toLowerCase();

  if (!intent) return true;

  if (intent === "free_user") {
    return tier === "free";
  }
  if (intent === "support_user") {
    return tier === "support" && billing === "active";
  }
  if (intent === "member_user") {
    return tier === "member" && billing === "active";
  }
  if (intent === "sponsor_user") {
    const os = String(p?.onboardingStatus || "").toLowerCase();
    const sp = String(p?.sponsorOnboardingPath || "").toLowerCase();
    if (os === "needs_review" || sp === "application") return true;
    return tier === "sponsor" && billing === "active";
  }
  return true;
}

/**
 * @param {Record<string, unknown>} p client profile / API DTO (DB-backed fields only)
 */
function baseStepDefs(p) {
  const sponsorIntent = normalizePublicAccountIntent(p?.accountIntent) === "sponsor_user";

  const headSteps = [
    {
      id: "name",
      label: "Add your first and last name",
      shortLabel: "Your name",
      actionKind: "profile-edit",
      editFocus: "name",
      check: (x) =>
        Boolean(String(x.firstName || "").trim()) && Boolean(String(x.lastName || "").trim()),
    },
    {
      id: "display",
      label: "Add a display name",
      shortLabel: "Display name",
      actionKind: "profile-edit",
      editFocus: "displayName",
      check: (x) => Boolean(String(x.displayName || "").trim()),
    },
    {
      id: "email",
      label: "Email on your profile",
      shortLabel: "Email",
      actionKind: "profile-edit",
      editFocus: "email",
      check: (x) => Boolean(String(x.email || "").trim()),
    },
    {
      id: "account_intent",
      label: "Choose how you plan to participate (saved to your account)",
      shortLabel: "Participation path",
      actionKind: "onboarding",
      editFocus: null,
      check: (x) => hasSavedAccountIntent(x),
    },
    {
      id: "photo",
      label: "Add a profile photo",
      shortLabel: "Profile photo",
      actionKind: "profile-edit",
      editFocus: "avatar",
      check: (x) => hasCustomPhoto(x),
    },
    {
      id: "about",
      label: "Add a short bio or tagline",
      shortLabel: "Bio / tagline",
      actionKind: "profile-edit",
      editFocus: "about",
      check: (x) => hasAboutText(x),
    },
    {
      id: "identity",
      label: "Add your role and mission statement",
      shortLabel: "Role & mission",
      actionKind: "profile-edit",
      editFocus: "identity",
      check: (x) => hasIdentityBasics(x),
    },
  ];

  const sponsorSteps = sponsorIntent
    ? [
        {
          id: "sponsor_org",
          label: "Add your organization name",
          shortLabel: "Organization",
          actionKind: "profile-edit",
          editFocus: "sponsorOrg",
          check: (x) => Boolean(String(x.sponsorOrgName || "").trim()),
        },
        {
          id: "sponsor_site",
          label: "Add your organization website",
          shortLabel: "Website",
          actionKind: "profile-edit",
          editFocus: "sponsorSite",
          check: (x) => Boolean(String(x.sponsorWebsite || "").trim()),
        },
      ]
    : [];

  const tailSteps = [
    {
      id: "membership",
      label: "Align membership billing with your chosen plan",
      shortLabel: "Membership",
      actionKind: "membership",
      editFocus: null,
      check: (x) => membershipMatchesSavedIntent(x),
    },
    {
      id: "onboarding",
      label: "Finish account onboarding",
      shortLabel: "Account setup",
      actionKind: "onboarding",
      editFocus: null,
      check: (x) => Boolean(x.onboardingCompleted),
    },
  ];

  return [...headSteps, ...sponsorSteps, ...tailSteps];
}

/**
 * @param {Record<string, unknown> | null | undefined} profile — from `profileRowToClientDto` or the same shape on the client
 */
export function computeProfileCompletion(profile) {
  const p = persistedShape(profile);
  const defs = baseStepDefs(p);
  const steps = defs.map((d) => {
    const done = !!d.check(p);
    return {
      id: d.id,
      label: d.label,
      shortLabel: d.shortLabel,
      done,
      actionKind: d.actionKind,
      editFocus: d.editFocus ?? null,
    };
  });
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percentage = total ? Math.round((completed / total) * 100) : 100;
  const nextStep = steps.find((s) => !s.done) || null;
  return {
    steps,
    completed,
    total,
    percentage,
    nextStep,
    isComplete: total > 0 && completed === total,
  };
}

/** Incomplete profile-edit focus ids for the Edit Profile modal (same rules as completion, evaluated on `draft`). */
export function getIncompleteEditFocusIds(profile) {
  const { steps } = computeProfileCompletion(profile);
  return new Set(
    steps.filter((s) => !s.done && s.actionKind === "profile-edit" && s.editFocus).map((s) => s.editFocus),
  );
}
