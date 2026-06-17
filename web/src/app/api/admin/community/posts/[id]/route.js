import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { sanitizeAdminHtml, htmlToPlainText } from "@/lib/admin/sanitizeHtml";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  buildCommunityCtaLinkUrl,
  buildCommunityFeedMediaJson,
} from "@/lib/community/adminCommunityPostPayload";
import {
  buildCommunityModerationPatch,
  notifyAuthorPostApproved,
} from "@/lib/community/communityPostModeration";

export const runtime = "nodejs";

const TABLE = "community_posts";

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-community-post-patch" });
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body?.action || "update").toLowerCase();
  const now = new Date().toISOString();

  const { data: existingPost, error: loadErr } = await ctx.admin
    .from(TABLE)
    .select("id,author_profile_id,title,body,status,deleted_at")
    .eq("id", postId)
    .maybeSingle();
  if (loadErr || !existingPost || existingPost.deleted_at) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const moderationPatch = buildCommunityModerationPatch(action, body, String(ctx.user?.id || ""));
  if (moderationPatch) {
    const { data, error } = await ctx.admin.from(TABLE).update(moderationPatch).eq("id", postId).select("*").maybeSingle();
    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (action === "approve") {
      await notifyAuthorPostApproved(ctx.admin, existingPost, postId);
    }
    await writeAdminAuditLog(ctx.admin, request, {
      actorWorkosUserId: String(ctx.user?.id || ""),
      actorEmail: String(ctx.user?.email || ""),
      action: `admin.community.posts.${action}`,
      resourceType: "community_posts",
      resourceId: postId,
      metadata: { prior_status: existingPost.status },
    });
    return Response.json({ ok: true, post: data });
  }

  const patch = { updated_at: now };

  if (action === "edit") {
    const title = String(body.title ?? "").trim().slice(0, 200);
    const text = sanitizeAdminHtml(String(body.body ?? "").trim());
    if (!htmlToPlainText(text).trim()) {
      return Response.json({ ok: false, error: "body_required" }, { status: 400 });
    }
    patch.title = title;
    patch.body = text;
    patch.is_edited = true;
    patch.moderation_notes = String(body.moderationNotes || body.moderation_notes || "").trim() || null;
    patch.reviewed_by = String(ctx.user?.id || "");
    patch.reviewed_at = now;
    if (body.post_type !== undefined) patch.post_type = String(body.post_type || "").slice(0, 64);
    if (body.photo_url !== undefined) {
      patch.photo_url = typeof body.photo_url === "string" ? body.photo_url.trim().slice(0, 120000) : "";
    }
    if (body.video_url !== undefined) patch.video_url = String(body.video_url || "").trim().slice(0, 500);
    if (body.podcast_url !== undefined) patch.podcast_url = String(body.podcast_url || "").trim().slice(0, 500);
    if (body.resource_url !== undefined) patch.resource_url = String(body.resource_url || "").trim().slice(0, 500);
    if (body.is_pinned !== undefined) patch.is_pinned = Boolean(body.is_pinned);
    if (body.comments_enabled !== undefined) patch.comments_enabled = body.comments_enabled !== false;
    if (body.featured !== undefined) patch.featured = Boolean(body.featured);
    if (
      body.cta_label !== undefined ||
      body.cta_url !== undefined ||
      body.link_url !== undefined
    ) {
      patch.link_url = buildCommunityCtaLinkUrl(body);
    }
    const feedMedia = buildCommunityFeedMediaJson(body);
    if (feedMedia) patch.feed_media_json = feedMedia;
    if (body.tags !== undefined) {
      const tagsRaw = body.tags;
      patch.tags = Array.isArray(tagsRaw)
        ? tagsRaw.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 12)
        : typeof tagsRaw === "string"
          ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12)
          : null;
    }
  } else if (action === "bookmark" || action === "unbookmark") {
    const bookmark = action === "bookmark";
    patch.admin_bookmark = bookmark;
    patch.admin_bookmark_at = bookmark ? now : null;
    patch.admin_bookmark_note = bookmark ? String(body.note || "").trim() || null : null;
    const profileRow = await getProfileRowByWorkOSId(ctx.admin, ctx.user.id);
    patch.admin_bookmark_by = bookmark && profileRow?.id ? profileRow.id : null;
  } else if (action === "publish" || action === "approve") {
    patch.status = "approved";
    patch.published_at = now;
    patch.rejection_reason = null;
    patch.reviewed_by = String(ctx.user?.id || "");
    patch.reviewed_at = now;
  } else if (action === "unpublish") {
    patch.status = "draft";
    patch.published_at = null;
  } else if (action === "hide" || action === "archive") {
    patch.status = "hidden";
    patch.published_at = null;
  } else if (action === "delete") {
    patch.deleted_at = now;
    patch.status = "hidden";
  } else {
    if (body.title !== undefined) patch.title = String(body.title || "").trim().slice(0, 200);
    if (body.body !== undefined) {
      const text = String(body.body || "").trim();
      if (text.length < 10) {
        return Response.json({ ok: false, error: "body_too_short" }, { status: 400 });
      }
      patch.body = text;
      patch.is_edited = true;
    }
    if (body.category !== undefined) patch.category = String(body.category || "").slice(0, 64);
    if (body.post_type !== undefined) patch.post_type = String(body.post_type || "").slice(0, 64);
    if (body.link_url !== undefined) patch.link_url = String(body.link_url || "").trim().slice(0, 500);
    if (body.photo_url !== undefined) {
      patch.photo_url = typeof body.photo_url === "string" ? body.photo_url.trim().slice(0, 120000) : "";
    }
    if (body.video_url !== undefined || body.videoUrl !== undefined) {
      patch.video_url = String(body.video_url ?? body.videoUrl ?? "").trim().slice(0, 500);
    }
    if (body.podcast_url !== undefined || body.podcastUrl !== undefined) {
      patch.podcast_url = String(body.podcast_url ?? body.podcastUrl ?? "").trim().slice(0, 500);
    }
    if (body.resource_url !== undefined || body.resourceUrl !== undefined) {
      patch.resource_url = String(body.resource_url ?? body.resourceUrl ?? "").trim().slice(0, 500);
    }
    if (body.is_pinned !== undefined || body.isPinned !== undefined) {
      patch.is_pinned = Boolean(body.is_pinned ?? body.isPinned);
    }
    if (body.comments_enabled !== undefined || body.commentsEnabled !== undefined) {
      patch.comments_enabled = body.comments_enabled !== false && body.commentsEnabled !== false;
    }
    if (
      body.cta_label !== undefined ||
      body.ctaLabel !== undefined ||
      body.cta_url !== undefined ||
      body.ctaUrl !== undefined ||
      body.link_url !== undefined
    ) {
      patch.link_url = buildCommunityCtaLinkUrl(body);
    }
    const feedMedia = buildCommunityFeedMediaJson(body);
    if (feedMedia) patch.feed_media_json = feedMedia;
    if (body.feed_layout !== undefined || body.feedLayout !== undefined) {
      patch.feed_layout = String(body.feed_layout ?? body.feedLayout ?? "").trim().slice(0, 32) || null;
    }
    if (body.tags !== undefined) {
      const tagsRaw = body.tags;
      patch.tags = Array.isArray(tagsRaw)
        ? tagsRaw.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 12)
        : typeof tagsRaw === "string"
          ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12)
          : null;
    }
    if (body.featured !== undefined) patch.featured = Boolean(body.featured);
    if (body.author_name !== undefined) patch.author_name = String(body.author_name || "").trim().slice(0, 120);
    if (body.publish === true) {
      patch.status = "approved";
      patch.published_at = now;
    }
    if (body.publish === false) {
      patch.status = "draft";
      patch.published_at = null;
    }
  }

  const { data, error } = await ctx.admin.from(TABLE).update(patch).eq("id", postId).select("*").maybeSingle();
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (action === "publish" && existingPost.status === "pending_review") {
    await notifyAuthorPostApproved(ctx.admin, existingPost, postId);
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: `admin.community.posts.${action}`,
    resourceType: "community_posts",
    resourceId: postId,
  });

  return Response.json({ ok: true, post: data });
}
