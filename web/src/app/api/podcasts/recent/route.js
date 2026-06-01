import { getCachedPodcastLandingBundle } from "@/lib/podcast/getCachedPodcastLanding";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bundle = await getCachedPodcastLandingBundle();
    const episodes = Array.isArray(bundle.episodes) ? bundle.episodes : [];
    return Response.json({
      ok: episodes.length > 0,
      episodes,
      featuredGuests: bundle.featuredGuests || [],
      degraded: !!bundle.degraded,
      source: bundle.source || "unknown",
      error: episodes.length ? null : bundle.error || null,
    });
  } catch (e) {
    return Response.json(
      { ok: false, episodes: [], featuredGuests: [], degraded: true, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
