import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

const TABLE = "podcast_upcoming_guests";

function revalidatePodcastLanding() {
  try {
    revalidateTag("podcast-public-landing");
  } catch {
    /* ignore */
  }
}

/** Platform admin: list all upcoming guest rows (draft + published). */
export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const { data, error } = await ctx.admin
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
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
  const name = String(body.name || "").trim();
  if (!name) return Response.json({ ok: false, error: "missing_name" }, { status: 400 });
  const row = {
    name,
    organization: String(body.organization || "").trim(),
    role_title: String(body.role_title || body.roleTitle || "").trim(),
    short_description: String(body.short_description || body.shortDescription || "").trim(),
    profile_image_url: String(body.profile_image_url || body.profileImageUrl || "").trim(),
    expected_episode_date: body.expected_episode_date || body.expectedEpisodeDate || null,
    status: String(body.status || "draft").toLowerCase() === "published" ? "published" : "draft",
    sort_order: Number(body.sort_order ?? body.sortOrder ?? 0) || 0,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await ctx.admin.from(TABLE).insert(row).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  revalidatePodcastLanding();
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
      const id = ids[i];
      await ctx.admin.from(TABLE).update({ sort_order: i, updated_at: new Date().toISOString() }).eq("id", id);
    }
    revalidatePodcastLanding();
    return Response.json({ ok: true, reordered: ids.length });
  }

  const id = String(body.id || "").trim();
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  const patch = { updated_at: new Date().toISOString() };
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.organization != null) patch.organization = String(body.organization).trim();
  if (body.role_title != null) patch.role_title = String(body.role_title).trim();
  if (body.roleTitle != null) patch.role_title = String(body.roleTitle).trim();
  if (body.short_description != null) patch.short_description = String(body.short_description).trim();
  if (body.shortDescription != null) patch.short_description = String(body.shortDescription).trim();
  if (body.profile_image_url != null) patch.profile_image_url = String(body.profile_image_url).trim();
  if (body.profileImageUrl != null) patch.profile_image_url = String(body.profileImageUrl).trim();
  if (body.expected_episode_date !== undefined) patch.expected_episode_date = body.expected_episode_date || null;
  if (body.expectedEpisodeDate !== undefined) patch.expected_episode_date = body.expectedEpisodeDate || null;
  if (body.status != null) {
    const s = String(body.status).toLowerCase();
    patch.status = s === "published" ? "published" : "draft";
  }
  if (body.sort_order != null || body.sortOrder != null) {
    patch.sort_order = Number(body.sort_order ?? body.sortOrder ?? 0) || 0;
  }
  const { data, error } = await ctx.admin.from(TABLE).update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  revalidatePodcastLanding();
  return Response.json({ ok: true, row: data });
}

export async function DELETE(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  const { error } = await ctx.admin.from(TABLE).delete().eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  revalidatePodcastLanding();
  return Response.json({ ok: true });
}
