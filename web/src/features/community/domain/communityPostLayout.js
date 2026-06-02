/** @typedef {'step' | 'carousel' | 'image' | 'podcast' | 'resource'} CommunityPostLayout */

const LAYOUT_BY_POST_TYPE = {
  platform_guide: "image",
  platform_guide_carousel: "carousel",
  platform_guide_image: "image",
  platform_guide_podcast: "podcast",
  platform_guide_resource: "resource",
};

/**
 * @param {string} postType
 * @param {string} [feedLayout]
 * @param {ReturnType<typeof parseCommunityFeedMedia>} [feedMedia]
 * @returns {CommunityPostLayout}
 */
export function resolveCommunityPostLayout(postType, feedLayout, feedMedia) {
  const explicit = String(feedLayout || "").trim().toLowerCase();
  if (explicit === "step") return "image";
  if (explicit && ["carousel", "image", "podcast", "resource"].includes(explicit)) {
    return /** @type {CommunityPostLayout} */ (explicit);
  }
  const pt = String(postType || "").trim();
  if (LAYOUT_BY_POST_TYPE[pt]) {
    return /** @type {CommunityPostLayout} */ (LAYOUT_BY_POST_TYPE[pt]);
  }
  const media = feedMedia && typeof feedMedia === "object" ? feedMedia : {};
  if (Array.isArray(media.slides) && media.slides.length) return "carousel";
  if (media.resource && typeof media.resource === "object") return "resource";
  if (pt.includes("podcast")) return "podcast";
  if (pt.includes("image")) return "image";
  if (pt.includes("carousel")) return "carousel";
  if (pt.includes("resource")) return "resource";
  return "image";
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
