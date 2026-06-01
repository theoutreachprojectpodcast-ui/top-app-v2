/** @typedef {'step' | 'carousel' | 'image' | 'podcast' | 'resource'} CommunityPostLayout */

const LAYOUT_BY_POST_TYPE = {
  platform_guide: "step",
  platform_guide_carousel: "carousel",
  platform_guide_image: "image",
  platform_guide_podcast: "podcast",
  platform_guide_resource: "resource",
};

/**
 * @param {string} postType
 * @param {string} [feedLayout]
 * @returns {CommunityPostLayout}
 */
export function resolveCommunityPostLayout(postType, feedLayout) {
  const explicit = String(feedLayout || "").trim().toLowerCase();
  if (explicit && ["step", "carousel", "image", "podcast", "resource"].includes(explicit)) {
    return /** @type {CommunityPostLayout} */ (explicit);
  }
  return /** @type {CommunityPostLayout} */ (LAYOUT_BY_POST_TYPE[String(postType || "").trim()] || "step");
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function parseCommunityFeedMedia(row) {
  const raw = row?.feed_media_json ?? row?.feedMediaJson;
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
