const TABLE = "page_content_blocks";

const ALLOWED_BLOCK_TYPES = new Set([
  "copy",
  "hero",
  "cta",
  "testimonial",
  "card",
  "carousel",
  "blog",
  "featured",
  "link",
  "image_block",
  "video_block",
  "other",
]);

const WIZARD_BLOCK_TYPE_MAP = {
  community_post: "blog",
  sponsor: "card",
  resource: "link",
  podcast_app: "other",
};

export function normalizeBlockType(raw) {
  const key = String(raw || "copy").trim().toLowerCase();
  const mapped = WIZARD_BLOCK_TYPE_MAP[key] || key;
  return ALLOWED_BLOCK_TYPES.has(mapped) ? mapped : "copy";
}

export function routeForContentBlock(pageKey, blockType) {
  const page = String(pageKey || "").toLowerCase();
  const type = String(blockType || "").toLowerCase();
  if (type === "sponsor" || page === "sponsors") return "/admin/sponsors";
  if (type === "community_post" || page === "community") return "/admin/community";
  if (type === "resource" || page === "trusted" || page === "nonprofit") return "/admin/trusted";
  if (type === "podcast_app" || page === "podcast") return "/admin/podcasts";
  if (type === "image_block" || page === "other") return "/admin/images";
  if (page === "homepage") return "/admin/content";
  return "/admin/content/blocks";
}

export function normalizeBlockPayload(body, actorId) {
  const tagsRaw = body?.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => String(t).trim()).filter(Boolean)
    : String(tagsRaw || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

  const bodyHtml = String(body?.body_html || body?.bodyHtml || "").trim();
  const bodyText =
    String(body?.body_text || body?.bodyText || "").trim() ||
    String(body?.body || "").trim();

  const metadata = {
    category: String(body?.category || "").trim(),
    tags,
    cta_label: String(body?.cta_label || body?.ctaLabel || "").trim(),
    cta_link: String(body?.cta_link || body?.ctaLink || "").trim(),
    publish_date: String(body?.publish_date || body?.publishDate || "").trim(),
    featured: Boolean(body?.featured),
    logo_url: String(body?.logo_url || body?.logoUrl || "").trim(),
    header_image_url: String(body?.header_image_url || body?.headerImageUrl || "").trim(),
    thumbnail_url: String(body?.thumbnail_url || body?.thumbnailUrl || "").trim(),
    video_url: String(body?.video_url || body?.videoUrl || "").trim(),
    podcast_embed: String(body?.podcast_embed || body?.podcastEmbed || "").trim(),
    wizard_content_type: String(body?.content_type || body?.contentType || "").trim(),
  };

  const pageKey = String(body?.page_key || body?.pageKey || "").trim();
  const blockType = String(body?.block_type || body?.blockType || body?.content_type || "copy").trim();

  return {
    page_key: pageKey,
    section_key: String(body?.section_key || body?.sectionKey || "main").trim() || "main",
    block_type: blockType || "copy",
    title: String(body?.title || "").trim().slice(0, 300),
    subtitle: String(body?.subtitle || "").trim().slice(0, 500),
    body_html: bodyHtml,
    body_text: bodyText,
    status: String(body?.status || "draft").trim() || "draft",
    display_order: Number.parseInt(String(body?.display_order ?? body?.displayOrder ?? "0"), 10) || 0,
    metadata,
    target_admin_route: String(body?.target_admin_route || "").trim() || routeForContentBlock(pageKey, blockType),
    updated_by: String(actorId || "").trim() || null,
    updated_at: new Date().toISOString(),
  };
}

/** Build a partial update object (PATCH) from request body. */
export function patchBlockPayload(body, actorId) {
  const patch = {
    updated_by: String(actorId || "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (body?.page_key !== undefined || body?.pageKey !== undefined) {
    patch.page_key = String(body.page_key || body.pageKey || "").trim();
  }
  if (body?.section_key !== undefined || body?.sectionKey !== undefined) {
    patch.section_key = String(body.section_key || body.sectionKey || "main").trim() || "main";
  }
  if (body?.block_type !== undefined || body?.blockType !== undefined || body?.content_type !== undefined) {
    patch.block_type = normalizeBlockType(body.block_type || body.blockType || body.content_type);
  }
  if (body?.title !== undefined) patch.title = String(body.title || "").trim().slice(0, 300);
  if (body?.subtitle !== undefined) patch.subtitle = String(body.subtitle || "").trim().slice(0, 500);
  if (body?.body_html !== undefined || body?.bodyHtml !== undefined) {
    patch.body_html = String(body.body_html || body.bodyHtml || "").trim();
  }
  if (body?.body_text !== undefined || body?.bodyText !== undefined || body?.body !== undefined) {
    patch.body_text = String(body.body_text || body.bodyText || body.body || "").trim().slice(0, 20000);
  }
  if (body?.status !== undefined) patch.status = String(body.status || "draft").trim();
  if (body?.display_order !== undefined || body?.displayOrder !== undefined) {
    patch.display_order = Number.parseInt(String(body.display_order ?? body.displayOrder ?? "0"), 10) || 0;
  }
  if (body?.metadata !== undefined || body?.category !== undefined || body?.tags !== undefined) {
    const base = normalizeBlockPayload({ ...body, page_key: body?.page_key || "x" }, actorId);
    patch.metadata = base.metadata;
  }
  if (patch.page_key) {
    patch.target_admin_route =
      String(body?.target_admin_route || "").trim() ||
      routeForContentBlock(patch.page_key, patch.block_type || "copy");
  }
  return patch;
}

export { TABLE };
