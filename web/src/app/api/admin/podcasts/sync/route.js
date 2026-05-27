import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { runPodcastYouTubeSync } from "@/lib/podcast/runPodcastYouTubeSync";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-app-api-admin-podcasts-sync-post" });
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
  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.podcasts.sync.POST",
    resourceType: "admin_mutation",
    resourceId: null,
    metadata: { route: "podcasts/sync" },
  });
  return Response.json({ ok: true, synced: result.synced, source: result.source, featured: result.featured });
}
