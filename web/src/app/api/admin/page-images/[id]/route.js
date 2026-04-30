import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";
const TABLE = "page_images";

export async function PATCH(request, { params }) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const id = String(params?.id || "").trim();
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const patch = {};
  if ("page_key" in body) patch.page_key = String(body.page_key || "").trim();
  if ("section_key" in body) patch.section_key = String(body.section_key || "default").trim();
  if ("image_kind" in body) patch.image_kind = String(body.image_kind || "hero").trim();
  if ("image_url" in body) patch.image_url = String(body.image_url || "").trim();
  if ("alt_text" in body) patch.alt_text = String(body.alt_text || "").trim();
  if ("display_order" in body) patch.display_order = Number.parseInt(String(body.display_order ?? "0"), 10) || 0;
  if ("is_active" in body) patch.is_active = !!body.is_active;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await ctx.admin.from(TABLE).update(patch).eq("id", id).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, row: data });
}

export async function DELETE(_request, { params }) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const id = String(params?.id || "").trim();
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  const { error } = await ctx.admin.from(TABLE).delete().eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
