export const PAGE_CONTENT_BLOCKS_TABLE = "page_content_blocks";

/** Status values that are visible on the public site. */
export const PUBLIC_PAGE_CONTENT_STATUSES = ["approved"];

/**
 * @param {import("@supabase/supabase-js").SupabaseClient | null} admin
 * @param {{ pageKey?: string, sectionKey?: string, limit?: number }} [opts]
 */
export async function loadPublicPageContentBlocks(admin, opts = {}) {
  if (!admin) return [];
  const pageKey = String(opts.pageKey || "").trim();
  const sectionKey = String(opts.sectionKey || "").trim();
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));

  let query = admin
    .from(PAGE_CONTENT_BLOCKS_TABLE)
    .select(
      "id, page_key, section_key, block_type, title, subtitle, body_html, body_text, display_order, metadata, updated_at",
    )
    .in("status", PUBLIC_PAGE_CONTENT_STATUSES)
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (pageKey) query = query.eq("page_key", pageKey);
  if (sectionKey) query = query.eq("section_key", sectionKey);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

/**
 * @param {Array<Record<string, unknown>>} blocks
 * @param {string} sectionKey
 */
export function pickPageContentBlock(blocks, sectionKey) {
  const key = String(sectionKey || "").trim();
  if (!key) return blocks[0] || null;
  return blocks.find((b) => String(b.section_key || "") === key) || blocks[0] || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} block
 */
export function pageContentBlockHtml(block) {
  if (!block) return "";
  const html = String(block.body_html || "").trim();
  if (html) return html;
  const text = String(block.body_text || block.title || "").trim();
  if (!text) return "";
  return `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}
