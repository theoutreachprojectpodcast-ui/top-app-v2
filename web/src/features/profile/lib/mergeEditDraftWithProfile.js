import { profileFromApiDto } from "@/features/profile/mappers";
import { normalizeContributionInterests } from "@/lib/profile/profileCompletenessModel";

function pickNonEmptyStringFields(obj) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && String(v).trim() !== "") out[k] = v;
  }
  return out;
}

/**
 * Re-hydrate the edit modal from the latest `profile` while keeping in-progress edits.
 * Touched keys (including cleared strings) always win over server values.
 *
 * @param {Record<string, unknown>} draft
 * @param {Record<string, unknown>} profile — live shape from `useProfileData`
 * @param {Set<string>} [touchedKeys]
 */
export function mergeEditDraftWithProfile(draft, profile, touchedKeys) {
  if (!draft || !profile) return draft;
  const base = profileFromApiDto(profile);
  if (touchedKeys?.has("__any__")) {
    const out = { ...base, ...draft };
    if (draft.contributionInterests && typeof draft.contributionInterests === "object") {
      out.contributionInterests = { ...normalizeContributionInterests(draft.contributionInterests) };
    }
    if (Array.isArray(draft.notificationPreferences)) {
      out.notificationPreferences = [...draft.notificationPreferences];
    }
    return out;
  }
  const out = { ...base, ...pickNonEmptyStringFields(draft) };
  if (touchedKeys && touchedKeys.size) {
    for (const key of touchedKeys) {
      if (Object.prototype.hasOwnProperty.call(draft, key)) {
        out[key] = draft[key];
      }
    }
  }
  if (touchedKeys?.has("contributionInterests") && draft.contributionInterests && typeof draft.contributionInterests === "object") {
    out.contributionInterests = { ...normalizeContributionInterests(draft.contributionInterests) };
  } else if (draft.contributionInterests && typeof draft.contributionInterests === "object") {
    out.contributionInterests = { ...normalizeContributionInterests(draft.contributionInterests) };
  }
  if (touchedKeys?.has("notificationPreferences") && Array.isArray(draft.notificationPreferences)) {
    out.notificationPreferences = [...draft.notificationPreferences];
  } else if (Array.isArray(draft.notificationPreferences)) {
    out.notificationPreferences = [...draft.notificationPreferences];
  }
  return out;
}
