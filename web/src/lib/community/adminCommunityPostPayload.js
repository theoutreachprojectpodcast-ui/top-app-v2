/**
 * Build Supabase row fields for admin-created community posts.
 */

/**
 * @param {Record<string, unknown>} body
 * @returns {string}
 */
export function buildCommunityCtaLinkUrl(body) {
  const ctaLabel = String(body?.cta_label ?? body?.ctaLabel ?? "").trim();
  const ctaUrl = String(body?.cta_url ?? body?.ctaUrl ?? "").trim();
  if (ctaLabel && ctaUrl) {
    return `cta:${ctaUrl}|${ctaLabel}`.slice(0, 500);
  }
  const link = String(body?.link_url ?? body?.linkUrl ?? "").trim();
  return link.slice(0, 500);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown> | null}
 */
export function buildCommunityFeedMediaJson(body) {
  const existing = body?.feed_media_json ?? body?.feedMediaJson;
  if (existing && typeof existing === "object") return existing;

  const slidesRaw = body?.carousel_images ?? body?.carouselImages ?? body?.images;
  const slides = Array.isArray(slidesRaw)
    ? slidesRaw.map((s) => String(s || "").trim()).filter(Boolean)
    : [];

  const resourceUrl = String(body?.resource_url ?? body?.resourceUrl ?? "").trim();
  const caption = String(body?.media_caption ?? body?.mediaCaption ?? "").trim();
  const imageAlt = String(body?.image_alt ?? body?.imageAlt ?? "").trim();

  const media = {};
  if (slides.length) {
    media.slides = slides.map((src, i) => ({
      src,
      alt: imageAlt || `Slide ${i + 1}`,
    }));
  }
  if (resourceUrl) {
    media.resource = {
      href: resourceUrl,
      title: String(body?.title || "").trim() || "Resource",
      summary: caption || "",
    };
  }
  if (caption) media.caption = caption;
  if (imageAlt) media.imageAlt = imageAlt;

  return Object.keys(media).length ? media : null;
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ publish?: boolean, now?: string }} [opts]
 */
export function buildAdminCommunityPostFields(body, opts = {}) {
  const publish = opts.publish === true || String(body?.status || "").toLowerCase() === "approved";
  const now = opts.now || new Date().toISOString();
  const postType = String(body?.post_type ?? body?.postType ?? "admin_update").slice(0, 64);
  const feedMedia = buildCommunityFeedMediaJson(body);

  let feedLayout = String(body?.feed_layout ?? body?.feedLayout ?? "").trim().toLowerCase();
  if (!feedLayout) {
    if (postType.includes("carousel") || (feedMedia?.slides?.length ?? 0) > 1) feedLayout = "carousel";
    else if (postType.includes("image")) feedLayout = "image";
    else if (postType.includes("podcast")) feedLayout = "podcast";
    else if (postType.includes("resource")) feedLayout = "resource";
    else if (postType.includes("video")) feedLayout = "video";
  }

  const tagsRaw = body?.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 12)
    : typeof tagsRaw === "string"
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12)
      : null;

  const fields = {
    title: String(body?.title || "").trim().slice(0, 200),
    body: String(body?.body || "").trim(),
    category: String(body?.category || "admin_update").slice(0, 64),
    post_type: postType,
    link_url: buildCommunityCtaLinkUrl(body),
    photo_url: typeof body?.photo_url === "string" ? body.photo_url.trim().slice(0, 120000) : "",
    video_url: String(body?.video_url ?? body?.videoUrl ?? "").trim().slice(0, 500),
    podcast_url: String(body?.podcast_url ?? body?.podcastUrl ?? "").trim().slice(0, 500),
    resource_url: String(body?.resource_url ?? body?.resourceUrl ?? "").trim().slice(0, 500),
    show_author_name: body?.show_author_name !== false,
    featured: Boolean(body?.featured ?? body?.is_featured),
    is_pinned: Boolean(body?.is_pinned ?? body?.isPinned),
    comments_enabled: body?.comments_enabled !== false && body?.commentsEnabled !== false,
    visibility: "community",
    status: publish ? "approved" : "draft",
    published_at: publish ? now : null,
    updated_at: now,
  };

  if (feedLayout) fields.feed_layout = feedLayout.slice(0, 32);
  if (feedMedia) fields.feed_media_json = feedMedia;
  if (tags?.length) fields.tags = tags;

  return fields;
}

/**
 * Sort feed rows: pinned first, then newest.
 * @param {Record<string, unknown>[]} rows
 */
export function sortCommunityFeedRows(rows) {
  return [...rows].sort((a, b) => {
    const pinA = a?.is_pinned ? 1 : 0;
    const pinB = b?.is_pinned ? 1 : 0;
    if (pinB !== pinA) return pinB - pinA;
    const tA = new Date(a?.created_at || a?.createdAt || 0).getTime();
    const tB = new Date(b?.created_at || b?.createdAt || 0).getTime();
    return tB - tA;
  });
}
