import { unstable_cache } from "next/cache";
import { listSponsorsCatalogWithClient } from "@/features/sponsors/api/sponsorCatalogApi";
import { normalizeSponsorRecord } from "@/features/sponsors/domain/sponsorViewModels";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCachedPodcastLandingBundle, podcastPublicCacheSeconds } from "@/lib/podcast/getCachedPodcastLanding";

const UPCOMING_TABLE = "podcast_upcoming_guests";

/**
 * Secondary podcast landing payload (sponsors, upcoming, episode–guest links, hero band).
 * Cached separately so the main bundle can revalidate without re-querying sponsors.
 */
export async function loadPodcastLandingExtras(admin, episodeIds = []) {
  if (!admin) {
    return {
      sponsors: [],
      upcomingGuests: [],
      episodeGuests: [],
      heroBandImageUrl: "",
    };
  }

  const ids = [...new Set((episodeIds || []).map((id) => String(id || "").trim()).filter(Boolean))].slice(0, 20);

  const [sponsorRows, upcomingRes, bandRes, guestsRes] = await Promise.all([
    listSponsorsCatalogWithClient(admin, { sponsorScope: "podcast" }),
    admin
      .from(UPCOMING_TABLE)
      .select(
        "id,sort_order,name,organization,role_title,short_description,profile_image_url,expected_episode_date,episode_topic,status,created_at",
      )
      .in("status", ["scheduled", "confirmed", "published"])
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(24),
    admin
      .from("page_images")
      .select("image_url")
      .eq("page_key", "podcasts")
      .eq("section_key", "hero-band")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(1),
    ids.length
      ? admin
          .from("podcast_episode_guests")
          .select("episode_id,guest_id,role_label,podcast_guests(id,slug,name,title,bio,avatar_url)")
          .in("episode_id", ids)
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const sponsors = (Array.isArray(sponsorRows) ? sponsorRows : []).map((r) => normalizeSponsorRecord(r));
  const upcomingGuests = upcomingRes.error ? [] : upcomingRes.data || [];
  const episodeGuests = guestsRes.error ? [] : guestsRes.data || [];
  const heroBandImageUrl = String((Array.isArray(bandRes.data) ? bandRes.data[0]?.image_url : "") || "").trim();

  return { sponsors, upcomingGuests, episodeGuests, heroBandImageUrl };
}

function mapUpcomingGuestRow(r) {
  return {
    id: r.id,
    slug: String(r.id || ""),
    name: r.name || "Guest",
    title:
      [String(r.role_title || "").trim(), String(r.organization || "").trim()].filter(Boolean).join(" · ") ||
      "Upcoming guest",
    bio:
      [String(r.short_description || "").trim(), String(r.episode_topic || "").trim()].filter(Boolean).join(" — ") ||
      "Scheduled conversation — details will be announced soon.",
    avatar_url: String(r.profile_image_url || "").trim(),
    upcoming: true,
  };
}

/**
 * Full server payload for /podcasts RSC (episodes + extras in parallel).
 */
export async function loadPodcastLandingPageData() {
  const admin = createSupabaseAdminClient();
  const bundle = await getCachedPodcastLandingBundle();
  const episodeIds = (bundle.episodes || []).map((ep) => ep?.id).filter(Boolean);
  const extras = await getCachedPodcastLandingExtras(episodeIds);
  return {
    ...bundle,
    sponsors: extras.sponsors,
    upcomingGuests: extras.upcomingGuests.map(mapUpcomingGuestRow),
    episodeGuests: extras.episodeGuests,
    heroBandImageUrl: extras.heroBandImageUrl,
  };
}

export async function getCachedPodcastLandingExtras(episodeIds = []) {
  const ttl = podcastPublicCacheSeconds();
  const key = [...episodeIds].sort().join(",");
  const cached = unstable_cache(
    async () => {
      const admin = createSupabaseAdminClient();
      return loadPodcastLandingExtras(admin, episodeIds);
    },
    ["podcast-landing-extras-v2", key],
    { revalidate: ttl, tags: ["podcast-landing-extras"] },
  );
  return cached();
}

export async function getCachedPodcastLandingPageData() {
  const bundle = await getCachedPodcastLandingBundle();
  const episodeIds = (bundle.episodes || []).map((ep) => ep?.id).filter(Boolean);
  const extras = await getCachedPodcastLandingExtras(episodeIds);
  return {
    ...bundle,
    sponsors: extras.sponsors,
    upcomingGuests: extras.upcomingGuests.map(mapUpcomingGuestRow),
    episodeGuests: extras.episodeGuests,
    heroBandImageUrl: extras.heroBandImageUrl,
  };
}
