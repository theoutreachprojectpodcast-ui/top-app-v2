import { EMPTY_PROFILE_AVATAR_URL } from "@/lib/avatarFallback";

/**
 * Profile completion model (tORP v0.3) — derived only from persisted profile + optional WorkOS user snapshot.
 * Used by GET /api/me and client UI; no standalone client-only progress state.
 */

/**
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

function hasCustomPhoto(p) {
  const u = String(p.avatarUrl || "").trim();
  if (!u) return false;
  if (u === EMPTY_PROFILE_AVATAR_URL) return false;
  if (u.endsWith("/avatar-placeholder.svg")) return false;
  return true;
}

function hasAboutText(p) {
  const bio = String(p.bio || "").trim();
  if (bio.length >= 12) return true;
  const banner = String(p.banner || "").trim();
  return banner.length >= 12;
}

/**
 * @param {Record<string, unknown>} p merged profile shape (client profile or API DTO)
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
      label: "Email on your account",
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
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {{ email?: string, firstName?: string, lastName?: string } | null} [workOSUser]
 */
export function computeProfileCompletion(profile, workOSUser = null) {
  const p = mergeProfileWithWorkOSUser(profile, workOSUser);
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

/** Set of `editFocus` ids for incomplete profile-edit steps (for Edit Profile modal highlights). */
export function getIncompleteEditFocusIds(profile, workOSUser = null) {
  const { steps } = computeProfileCompletion(profile, workOSUser);
  return new Set(
    steps.filter((s) => !s.done && s.actionKind === "profile-edit" && s.editFocus).map((s) => s.editFocus),
  );
}
