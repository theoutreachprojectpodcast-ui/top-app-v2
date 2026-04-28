import { profileFromApiDto } from "@/features/profile/mappers";

function pickNonEmptyStringFields(obj) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && String(v).trim() !== "") out[k] = v;
  }
  return out;
}

/**
 * Re-hydrate the edit modal from the latest `profile` while keeping any non-empty fields
 * the user has already typed (avoids wiping in-progress edits).
 *
 * @param {Record<string, unknown>} draft
 * @param {Record<string, unknown>} profile — live shape from `useProfileData`
 */
export function mergeEditDraftWithProfile(draft, profile) {
  if (!draft || !profile) return draft;
  return { ...profileFromApiDto(profile), ...pickNonEmptyStringFields(draft) };
}
