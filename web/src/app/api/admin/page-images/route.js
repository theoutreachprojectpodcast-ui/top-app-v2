import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";
const TABLE = "page_images";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const { data, error } = await ctx.admin
    .from(TABLE)
    .select("*")
    .order("page_key", { ascending: true })
    .order("section_key", { ascending: true })
    .order("display_order", { ascending: true })
    .limit(500);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, rows: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const payload = {
    page_key: String(body?.page_key || "").trim(),
    section_key: String(body?.section_key || "default").trim(),
    image_kind: String(body?.image_kind || "hero").trim(),
    image_url: String(body?.image_url || "").trim(),
    alt_text: String(body?.alt_text || "").trim(),
    is_active: body?.is_active !== false,
    display_order: Number.parseInt(String(body?.display_order ?? "0"), 10) || 0,
  };
  if (!payload.page_key || !payload.image_url) {
    return Response.json({ ok: false, error: "page_key_and_image_url_required" }, { status: 400 });
  }
  const { data, error } = await ctx.admin.from(TABLE).insert(payload).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, row: data });
}
