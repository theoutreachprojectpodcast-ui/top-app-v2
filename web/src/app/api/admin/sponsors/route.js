import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.admin
    .from("sponsors_catalog")
    .select("*")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, rows: data || [] });
}
