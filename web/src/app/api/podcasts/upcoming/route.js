import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  podcastPublicCacheControlHeader,
  podcastPublicCacheSeconds,
} from "@/lib/podcast/getCachedPodcastLanding";

export const runtime = "nodejs";

const TABLE = "podcast_upcoming_guests";

async function loadUpcomingGuests() {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, guests: [], error: "storage_unavailable" };
  const { data, error } = await admin
    .from(TABLE)
    .select(
      "id,sort_order,name,organization,role_title,short_description,profile_image_url,expected_episode_date,episode_topic,status,created_at",
    )
    .in("status", ["scheduled", "confirmed", "published"])
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) return { ok: false, guests: [], error: error.message };
  return { ok: true, guests: data || [] };
}

const getCachedUpcomingGuests = unstable_cache(
  loadUpcomingGuests,
  ["podcast-upcoming-guests-v1"],
  { revalidate: podcastPublicCacheSeconds(), tags: ["podcast-upcoming-guests"] },
);

/** Public: published upcoming guests only (service read). */
export async function GET() {
  const cacheControl = podcastPublicCacheControlHeader();
  const payload = await getCachedUpcomingGuests();
  if (!payload.ok && payload.error === "storage_unavailable") {
    return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!payload.ok) {
    return Response.json(payload, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(payload, { headers: { "Cache-Control": cacheControl } });
}
