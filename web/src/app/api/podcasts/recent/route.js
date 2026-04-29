import { getCachedPodcastLandingBundle } from "@/lib/podcast/getCachedPodcastLanding";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bundle = await getCachedPodcastLandingBundle();
    return Response.json({
      ok: true,
      episodes: bundle.episodes || [],
      featuredGuests: bundle.featuredGuests || [],
      degraded: !!bundle.degraded,
      source: bundle.source || "unknown",
      error: bundle.error || null,
    });
  } catch (e) {
    return Response.json(
      { ok: false, episodes: [], featuredGuests: [], degraded: true, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
