/** Max stored length for optional community post cover URLs (public https links only). */
export const COMMUNITY_STORY_PHOTO_URL_MAX = 2048;

/**
 * Optional story cover: keep https URLs only; drop data URLs, relative paths, and other invalid values.
 * @param {unknown} raw
 * @param {{ maxLen?: number }} [opts]
 */
export function sanitizeCommunityStoryPhotoUrl(raw, { maxLen = COMMUNITY_STORY_PHOTO_URL_MAX } = {}) {
  const trimmed = typeof raw === "string" ? raw.trim().slice(0, maxLen) : "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}
