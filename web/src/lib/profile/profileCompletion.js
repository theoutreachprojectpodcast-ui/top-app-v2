import { EMPTY_PROFILE_AVATAR_URL } from "@/lib/avatarFallback";

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

/**
 * @param {Record<string, unknown>} p client profile / API DTO (DB-backed fields only)
 */
function baseStepDefs(p) {
  const sponsorIntent = String(p.accountIntent || "").toLowerCase() === "sponsor_user";

  const steps = [
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
      id: "onboarding",
      label: "Finish account onboarding",
      shortLabel: "Account setup",
      actionKind: "onboarding",
      editFocus: null,
      check: (x) => Boolean(x.onboardingCompleted),
    },
  ];

  if (sponsorIntent) {
    steps.push(
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
    );
  }

  return steps;
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
