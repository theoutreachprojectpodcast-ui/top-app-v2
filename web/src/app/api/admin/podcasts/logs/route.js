import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const { data, error } = await ctx.admin
    .from("podcast_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return Response.json({ ok: false, error: error.message, rows: [] }, { status: 200 });
  return Response.json({ ok: true, rows: data || [] });
}
