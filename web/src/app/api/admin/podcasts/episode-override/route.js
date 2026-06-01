import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function PATCH(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-app-api-admin-podcasts-episode-override-patch" });
  if (!ctx.ok) return ctx.response;
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const youtubeVideoId = String(body.youtubeVideoId || body.youtube_video_id || "").trim();
  const manualOverride = String(body.manualOverride || body.manual_override || "").trim().toLowerCase();
  if (!youtubeVideoId) return Response.json({ ok: false, error: "missing_youtube_video_id" }, { status: 400 });
  if (!["include", "exclude", "clear"].includes(manualOverride)) {
    return Response.json({ ok: false, error: "invalid_manual_override" }, { status: 400 });
  }
  const value = manualOverride === "clear" ? null : manualOverride;
  const { error } = await ctx.admin
    .from("podcast_episodes")
    .update({ manual_override: value, updated_at: new Date().toISOString() })
    .eq("youtube_video_id", youtubeVideoId);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  try {
    revalidateTag("podcast-public-landing");
  } catch {
    // ignore
  }
  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.podcasts.episode-override.PATCH",
    resourceType: "admin_mutation",
    resourceId: null,
    metadata: { route: "podcasts/episode-override" },
  });
  return Response.json({ ok: true });
}
