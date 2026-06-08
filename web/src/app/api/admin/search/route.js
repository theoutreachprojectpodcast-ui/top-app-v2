import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";
import { routeForContentBlock } from "@/lib/admin/pageContentBlocks";

export const runtime = "nodejs";

function ilikePattern(q) {
  const safe = String(q || "")
    .toLowerCase()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${safe}%`;
}

/**
 * @param {string} q
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 */
async function searchContent(q, admin) {
  const pattern = ilikePattern(q);
  /** @type {Array<{ id: string, label: string, href: string, kind: string, meta: string }>} */
  const results = [];

  async function tryQuery(fn) {
    try {
      await fn();
    } catch {
      /* network / unexpected */
    }
  }

  await tryQuery(async () => {
    const { data: blocks, error } = await admin
      .from("page_content_blocks")
      .select("id, page_key, section_key, title, body_text, target_admin_route, block_type")
      .or(`title.ilike.${pattern},body_text.ilike.${pattern},section_key.ilike.${pattern}`)
      .limit(12);
    if (error) return;

    for (const row of blocks || []) {
      const title = String(row.title || row.section_key || "Content block").trim();
      const page = String(row.page_key || "").trim();
      results.push({
        id: `block-${row.id}`,
        label: `${page ? `${page} · ` : ""}${title}`,
        href: row.target_admin_route || routeForContentBlock(page, row.block_type) || `/admin/content/blocks`,
        kind: "content_block",
        meta: "Page content block",
      });
    }
  });

  await tryQuery(async () => {
    const { data: sponsors } = await admin
      .from("sponsors_catalog")
      .select("slug, name, display_name")
      .or(`name.ilike.${pattern},display_name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(10);

    for (const row of sponsors || []) {
      const name = String(row.display_name || row.name || row.slug || "").trim();
      if (!name) continue;
      results.push({
        id: `sponsor-${row.slug}`,
        label: name,
        href: `/admin/sponsors${row.slug ? `#${row.slug}` : ""}`,
        kind: "sponsor",
        meta: "Sponsor catalog",
      });
    }
  });

  await tryQuery(async () => {
    const { data: trusted } = await admin
      .from("trusted_resources")
      .select("id, name, slug")
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(10);

    for (const row of trusted || []) {
      results.push({
        id: `trusted-${row.id}`,
        label: String(row.name || row.slug || "Trusted resource").trim(),
        href: `/admin/trusted`,
        kind: "trusted_resource",
        meta: "Trusted resource",
      });
    }
  });

  await tryQuery(async () => {
    const { data: posts } = await admin
      .from("community_posts")
      .select("id, title, status")
      .ilike("title", pattern)
      .is("deleted_at", null)
      .limit(8);

    for (const row of posts || []) {
      results.push({
        id: `post-${row.id}`,
        label: String(row.title || "Community post").trim(),
        href: `/admin/community`,
        kind: "community_post",
        meta: `Community · ${row.status || "draft"}`,
      });
    }
  });

  await tryQuery(async () => {
    const { data: users } = await admin
      .from(profileTableName())
      .select("workos_user_id, email, display_name")
      .or(`email.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(8);

    for (const row of users || []) {
      const label = String(row.display_name || row.email || "User").trim();
      results.push({
        id: `user-${row.workos_user_id}`,
        label,
        href: `/admin/users`,
        kind: "user",
        meta: row.email ? String(row.email) : "User profile",
      });
    }
  });

  await tryQuery(async () => {
    const { data: images } = await admin
      .from("page_images")
      .select("id, page_key, image_kind, alt_text")
      .or(`page_key.ilike.${pattern},alt_text.ilike.${pattern},image_kind.ilike.${pattern}`)
      .limit(8);

    for (const row of images || []) {
      results.push({
        id: `image-${row.id}`,
        label: `${row.page_key || "page"} · ${row.image_kind || "image"}`,
        href: `/admin/images`,
        kind: "page_image",
        meta: row.alt_text ? String(row.alt_text).slice(0, 80) : "Page image",
      });
    }
  });

  return results;
}

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return Response.json({ ok: true, results: [] });
  }

  try {
    const results = await searchContent(q, ctx.admin);
    return Response.json({ ok: true, results });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || "search_failed" }, { status: 500 });
  }
}
