import { Suspense } from "react";
import PodcastsLandingPage from "@/features/podcasts/components/PodcastsLandingPage";
import { getCachedPodcastLandingBundle } from "@/lib/podcast/getCachedPodcastLanding";

export const dynamic = "force-dynamic";

function PodcastsFallback() {
  return (
    <div className="appShell appShell--podcast" style={{ minHeight: "60vh", padding: 24 }}>
      <p style={{ color: "#a8b8d3" }}>Loading podcast…</p>
    </div>
  );
}

export default async function PodcastsPageRoute() {
  const bundle = await getCachedPodcastLandingBundle();
  return (
    <Suspense fallback={<PodcastsFallback />}>
      <PodcastsLandingPage
        initialEpisodes={bundle.episodes || []}
        initialFeaturedGuests={bundle.featuredGuests || []}
        initialBundleMeta={{
          degraded: !!bundle.degraded,
          source: bundle.source || "",
          error: bundle.error || "",
        }}
      />
    </Suspense>
  );
}
