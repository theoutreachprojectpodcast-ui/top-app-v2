import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
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
    const text = String(body.body ?? "").trim();
    if (!text) {
      return Response.json({ ok: false, error: "body_required" }, { status: 400 });
    }
    patch.title = title;
    patch.body = text;
    patch.is_edited = true;
    patch.moderation_notes = String(body.moderationNotes || body.moderation_notes || "").trim() || null;
    patch.reviewed_by = String(ctx.user?.id || "");
    patch.reviewed_at = now;
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
