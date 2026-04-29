import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { runPodcastYouTubeSync } from "@/lib/podcast/runPodcastYouTubeSync";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function POST() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  const result = await runPodcastYouTubeSync(ctx.admin);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error || "sync_failed", synced: 0 }, { status: 500 });
  }
  try {
    revalidateTag("podcast-public-landing");
  } catch {
    // Next version differences — cache still TTL-expires
  }
  return Response.json({ ok: true, synced: result.synced, source: result.source, featured: result.featured });
}
