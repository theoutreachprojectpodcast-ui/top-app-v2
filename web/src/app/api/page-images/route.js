import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const TABLE = "page_images";

export async function GET(request) {
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ ok: true, rows: [] });
  const { searchParams } = new URL(request.url);
  const pageKey = String(searchParams.get("pageKey") || "").trim();
  const sectionKey = String(searchParams.get("sectionKey") || "").trim();
  let query = admin
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(100);
  if (pageKey) query = query.eq("page_key", pageKey);
  if (sectionKey) query = query.eq("section_key", sectionKey);
  const { data, error } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, rows: data || [] });
}
