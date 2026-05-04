import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadPublicPodcastLandingData } from "@/lib/podcast/publicPodcastRead";

export function podcastPublicCacheSeconds() {
  const raw = String(process.env.PODCAST_CACHE_TTL || "").trim();
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 900;
}

/**
 * Cached podcast landing payload for RSC + API routes (revalidate = PODCAST_CACHE_TTL seconds).
 */
export async function getCachedPodcastLandingBundle() {
  const ttl = podcastPublicCacheSeconds();
  const cached = unstable_cache(
    async () => {
      const admin = createSupabaseAdminClient();
      return loadPublicPodcastLandingData(admin);
    },
    ["podcast-public-landing-v2"],
    { revalidate: ttl, tags: ["podcast-public-landing"] }
  );
  return cached();
}
