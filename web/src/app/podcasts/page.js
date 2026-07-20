import { Suspense } from "react";
import PodcastsLandingPage from "@/features/podcasts/components/PodcastsLandingPage";
import { getCachedPodcastLandingPageData } from "@/lib/podcast/podcastLandingPageData";

/** ISR for /podcasts (default 900s; unstable_cache honors PODCAST_CACHE_TTL). */
export const revalidate = 900;

function PodcastsFallback() {
  return (
    <div className="appShell appShell--podcast" style={{ minHeight: "60vh", padding: 24 }}>
      <p style={{ color: "#a8b8d3" }}>Loading podcast…</p>
    </div>
  );
}

export default async function PodcastsPageRoute() {
  const data = await getCachedPodcastLandingPageData();
  return (
    <Suspense fallback={<PodcastsFallback />}>
      <PodcastsLandingPage
        initialEpisodes={data.episodes || []}
        initialSponsors={data.sponsors || []}
        initialUpcomingGuests={data.upcomingGuests || []}
        initialEpisodeGuests={data.episodeGuests || []}
        initialHeroBandImageUrl={data.heroBandImageUrl || ""}
        initialBundleMeta={{
          degraded: !!data.degraded,
          source: data.source || "",
          error: data.episodes?.length ? "" : data.error || "",
        }}
      />
    </Suspense>
  );
}
