import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";
const TABLE = "form_submissions";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const { searchParams } = new URL(request.url);
  const status = String(searchParams.get("status") || "").trim();
  let query = ctx.admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, rows: data || [] });
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const id = String(body?.id || "").trim();
  const status = String(body?.status || "").trim();
  if (!id || !status) return Response.json({ ok: false, error: "id_and_status_required" }, { status: 400 });
  const { data, error } = await ctx.admin
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, row: data });
}
