import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TABLE = "podcast_upcoming_guests";

/** Public: published upcoming guests only (service read). */
export async function GET() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, guests: [], error: "storage_unavailable" }, { status: 503 });
  }
  const { data, error } = await admin
    .from(TABLE)
    .select("id,sort_order,name,organization,role_title,short_description,profile_image_url,expected_episode_date,status,created_at")
    .eq("status", "published")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ ok: false, guests: [], error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, guests: data || [] });
}
