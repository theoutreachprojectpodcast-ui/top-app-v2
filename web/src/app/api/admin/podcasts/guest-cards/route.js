import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

const TABLE = "podcast_guests";

function touchPodcastLanding() {
  try {
    revalidateTag("podcast-public-landing");
  } catch {
    // ignore
  }
}

function toStringValue(v, max = 4000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.admin
    .from(TABLE)
    .select("*")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, rows: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = toStringValue(body.name, 240);
  if (!name) return Response.json({ ok: false, error: "missing_name" }, { status: 400 });
  const slug = toStringValue(body.slug, 240)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) return Response.json({ ok: false, error: "missing_slug" }, { status: 400 });

  const row = {
    slug,
    name,
    title: toStringValue(body.title, 240),
    organization: toStringValue(body.organization, 240),
    role_title: toStringValue(body.role_title ?? body.roleTitle, 240),
    quote: toStringValue(body.quote, 1200),
    avatar_url: toStringValue(body.image_url ?? body.avatar_url ?? body.avatarUrl, 1200),
    source_url: toStringValue(body.source_url ?? body.sourceUrl, 1200),
    website_url: toStringValue(body.website_url ?? body.websiteUrl, 1200),
    bio: toStringValue(body.bio, 2000),
    episode_id: body.episode_id || body.episodeId || null,
    admin_override: !!body.admin_override || !!body.adminOverride,
    display_order: Number(body.display_order ?? body.displayOrder ?? 0) || 0,
    active: body.active == null ? true : !!body.active,
    featured: true,
    upcoming: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await ctx.admin.from(TABLE).insert(row).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  touchPodcastLanding();
  return Response.json({ ok: true, row: data });
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.reorder && Array.isArray(body.ids)) {
    const ids = body.ids.map((id) => String(id || "").trim()).filter(Boolean);
    for (let i = 0; i < ids.length; i++) {
      await ctx.admin.from(TABLE).update({ display_order: i, updated_at: new Date().toISOString() }).eq("id", ids[i]);
    }
    touchPodcastLanding();
    return Response.json({ ok: true, reordered: ids.length });
  }

  const id = toStringValue(body.id, 120);
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

  const patch = { updated_at: new Date().toISOString() };
  if (body.name != null) patch.name = toStringValue(body.name, 240);
  if (body.slug != null) {
    patch.slug = toStringValue(body.slug, 240)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  if (body.title != null) patch.title = toStringValue(body.title, 240);
  if (body.organization != null) patch.organization = toStringValue(body.organization, 240);
  if (body.role_title != null || body.roleTitle != null) patch.role_title = toStringValue(body.role_title ?? body.roleTitle, 240);
  if (body.quote != null) patch.quote = toStringValue(body.quote, 1200);
  if (body.image_url != null || body.avatar_url != null || body.avatarUrl != null) {
    patch.avatar_url = toStringValue(body.image_url ?? body.avatar_url ?? body.avatarUrl, 1200);
  }
  if (body.source_url != null || body.sourceUrl != null) patch.source_url = toStringValue(body.source_url ?? body.sourceUrl, 1200);
  if (body.website_url != null || body.websiteUrl != null) patch.website_url = toStringValue(body.website_url ?? body.websiteUrl, 1200);
  if (body.bio != null) patch.bio = toStringValue(body.bio, 2000);
  if (body.episode_id !== undefined || body.episodeId !== undefined) patch.episode_id = body.episode_id ?? body.episodeId ?? null;
  if (body.admin_override != null || body.adminOverride != null) patch.admin_override = !!(body.admin_override ?? body.adminOverride);
  if (body.display_order != null || body.displayOrder != null) patch.display_order = Number(body.display_order ?? body.displayOrder ?? 0) || 0;
  if (body.active != null) patch.active = !!body.active;
  if (body.featured != null) patch.featured = !!body.featured;

  const { data, error } = await ctx.admin.from(TABLE).update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  touchPodcastLanding();
  return Response.json({ ok: true, row: data });
}

export async function DELETE(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const url = new URL(request.url);
  const id = toStringValue(url.searchParams.get("id"), 120);
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

  const { error } = await ctx.admin.from(TABLE).delete().eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  touchPodcastLanding();
  return Response.json({ ok: true });
}
