import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { runPodcastYouTubeSync } from "@/lib/podcast/runPodcastYouTubeSync";

export const runtime = "nodejs";

/** @deprecated Prefer POST /api/admin/podcasts/sync — kept for older admin scripts. */
export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-podcasts-sync-youtube", limit: 10 });
  if (!ctx.ok) return ctx.response;
  const result = await runPodcastYouTubeSync(ctx.admin);
  if (!result.ok) {
    return Response.json({ error: result.error || "sync_failed", synced: 0 }, { status: 500 });
  }
  return Response.json({ ok: true, synced: result.synced, source: result.source, featured: result.featured });
}
