import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function PATCH(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const youtubeVideoId = String(body.youtubeVideoId || body.youtube_video_id || "").trim();
  if (!youtubeVideoId) return Response.json({ ok: false, error: "missing_youtube_video_id" }, { status: 400 });

  const patch = {
    updated_at: new Date().toISOString(),
  };
  if (body.guest_name != null) patch.guest_name = body.guest_name;
  if (body.guestName != null) patch.guest_name = body.guestName;
  if (body.organization != null) patch.organization = body.organization;
  if (body.role_title != null) patch.role_title = body.role_title;
  if (body.roleTitle != null) patch.role_title = body.roleTitle;
  if (body.short_bio != null) patch.short_bio = body.short_bio;
  if (body.shortBio != null) patch.short_bio = body.shortBio;
  if (body.discussion_summary != null) patch.discussion_summary = body.discussion_summary;
  if (body.discussionSummary != null) patch.discussion_summary = body.discussionSummary;
  if (body.profile_image_url != null) patch.profile_image_url = body.profile_image_url;
  if (body.profileImageUrl != null) patch.profile_image_url = body.profileImageUrl;
  if (body.admin_profile_image_url != null) patch.admin_profile_image_url = body.admin_profile_image_url;
  if (body.adminProfileImageUrl != null) patch.admin_profile_image_url = body.adminProfileImageUrl;
  if (body.verified_for_public != null) patch.verified_for_public = body.verified_for_public;
  if (body.verifiedForPublic != null) patch.verified_for_public = body.verifiedForPublic;
  if (body.admin_notes != null) patch.admin_notes = body.admin_notes;
  if (body.confidence_score != null) patch.confidence_score = body.confidence_score;
  if (body.confidenceScore != null) patch.confidence_score = body.confidenceScore;
  if (Array.isArray(body.source_urls)) patch.source_urls = body.source_urls;
  if (Array.isArray(body.sourceUrls)) patch.source_urls = body.sourceUrls;

  const { error } = await ctx.admin.from("podcast_episode_featured_guest").update(patch).eq("youtube_video_id", youtubeVideoId);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  try {
    revalidateTag("podcast-public-landing");
  } catch {
    // ignore
  }
  return Response.json({ ok: true });
}
