import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { profileMayCreateCommunityPost } from "@/lib/account/entitlements";
import { createPlatformNotification, notifyStaffProfiles } from "@/server/notifications/notificationService";
import {
  buildCommunityModerationPatch,
  notifyAuthorPostApproved,
} from "@/lib/community/communityPostModeration";
import { sanitizeCommunityStoryPhotoUrl } from "@/features/community/domain/communityStoryPhoto";

const TABLE = "community_posts";

export async function PATCH(request, context) {
  const __guard = guardMutation(request, { rateKey: "community-post-patch", limit: 30 });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Server storage unavailable." }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, user.id);
  const mod = isCommunityModeratorServer({
    email: user.email,
    workosUserId: user.id,
    profileRow,
  });
  const platAdmin = isPlatformAdminServer({
    email: user.email,
    workosUserId: user.id,
    profileRow,
  });

  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ ok: false, message: "Missing post id." }, { status: 400 });
  }

  let json;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const action = String(json.action || "").toLowerCase();
  const now = new Date().toISOString();

  const { data: existingPost, error: loadPostErr } = await admin
    .from(TABLE)
    .select("id,author_profile_id,author_id,title,body,status,published_at,deleted_at")
    .eq("id", postId)
    .maybeSingle();
  if (loadPostErr || !existingPost) {
    return Response.json({ ok: false, message: "Post not found." }, { status: 404 });
  }
  if (existingPost.deleted_at) {
    return Response.json({ ok: false, message: "Post not found." }, { status: 404 });
  }

  if (action === "author_edit") {
    const pid = profileRow?.id ? String(profileRow.id) : "";
    const authorPid = existingPost.author_profile_id ? String(existingPost.author_profile_id) : "";
    const isAuthor =
      (pid && authorPid && pid === authorPid) ||
      (!authorPid && String(existingPost.author_id || "") === String(user.id));
    if (!isAuthor) {
      return Response.json({ ok: false, message: "You can only edit your own posts." }, { status: 403 });
    }
    if (!profileMayCreateCommunityPost(profileRow)) {
      return Response.json(
        {
          ok: false,
          message:
            "Community posting is moderator-led for launch. Member story editing is not available in V1.",
        },
        { status: 403 },
      );
    }
    const st = String(existingPost.status || "").toLowerCase();
    if (st !== "pending_review" && st !== "approved") {
      return Response.json(
        { ok: false, message: "This post can’t be edited in its current review state." },
        { status: 400 },
      );
    }
    const title = String(json.title ?? "").trim().slice(0, 200);
    const text = String(json.body ?? "").trim();
    if (text.length < 20) {
      return Response.json({ ok: false, message: "Your story should be at least 20 characters." }, { status: 400 });
    }
    if (text.length > 20000) {
      return Response.json({ ok: false, message: "Your story is too long (max 20,000 characters)." }, { status: 400 });
    }
    const wasApproved = st === "approved";
    const editPatch = {
      title,
      body: text,
      nonprofit_name: String(json.nonprofit_name || "").trim().slice(0, 200),
      nonprofit_ein: json.nonprofit_ein ? String(json.nonprofit_ein).replace(/\D/g, "").slice(0, 9) || null : null,
      category: String(json.category || "success_story").slice(0, 64),
      post_type: String(json.post_type || "share_story").slice(0, 64),
      show_author_name: json.show_author_name !== false,
      link_url: String(json.link_url || "").trim().slice(0, 500),
      photo_url: sanitizeCommunityStoryPhotoUrl(json.photo_url),
      is_edited: true,
      updated_at: now,
    };
    if (wasApproved) {
      editPatch.status = "pending_review";
      editPatch.published_at = null;
      editPatch.reviewed_by = null;
      editPatch.reviewed_at = null;
      editPatch.rejection_reason = null;
    }
    const { error } = await admin.from(TABLE).update(editPatch).eq("id", postId);
    if (error) {
      return Response.json({ ok: false, message: error.message || "Update failed." }, { status: 500 });
    }
    if (wasApproved && profileRow?.id) {
      await createPlatformNotification(admin, {
        recipientProfileId: profileRow.id,
        audienceScope: "user",
        type: "community_post_revision_queued",
        title: "Your story was sent back for review",
        message:
          "You edited a published story. It is hidden from the public feed until a moderator reviews your changes.",
        linkPath: "/community",
        entityType: "community_post",
        entityId: postId,
        metadata: { post_id: postId },
      });
      await notifyStaffProfiles(admin, {
        type: "community_post_author_revised",
        title: "Community story revised (re-review)",
        message: title
          ? `“${title.slice(0, 80)}${title.length > 80 ? "…" : ""}” was edited by the author and needs review again.`
          : "A published story was edited by the author and returned to the review queue.",
        linkPath: "/community",
        entityType: "community_post",
        entityId: postId,
        dedupeHours: 2,
        metadata: { post_id: postId, author_profile_id: profileRow.id },
      });
    }
    return Response.json({
      ok: true,
      message: wasApproved
        ? "Your changes were saved. The story is back in the review queue and hidden from the public feed until approved again."
        : "Your changes were saved. Moderators will still review before publishing.",
    });
  }

  if (action === "bookmark" || action === "unbookmark") {
    if (!platAdmin) {
      return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });
    }
    const bookmark = action === "bookmark";
    const bookmarkPatch = {
      updated_at: now,
      admin_bookmark: bookmark,
      admin_bookmark_at: bookmark ? now : null,
      admin_bookmark_note: bookmark ? String(json.note || "").trim() || null : null,
      admin_bookmark_by: bookmark && profileRow?.id ? profileRow.id : null,
    };
    const { error } = await admin.from(TABLE).update(bookmarkPatch).eq("id", postId);
    if (error) {
      return Response.json({ ok: false, message: error.message || "Update failed." }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  if (!mod) {
    return Response.json({ ok: false, message: "Moderator access required." }, { status: 403 });
  }

  const moderationPatch = buildCommunityModerationPatch(action, json, user.id);
  if (moderationPatch) {
    const { error } = await admin.from(TABLE).update(moderationPatch).eq("id", postId);
    if (error) {
      return Response.json({ ok: false, message: error.message || "Update failed." }, { status: 500 });
    }
    if (action === "approve") {
      await notifyAuthorPostApproved(admin, existingPost, postId);
    }
    return Response.json({ ok: true });
  }

  if (action === "edit") {
    if (!mod) {
      return Response.json({ ok: false, message: "Moderator access required." }, { status: 403 });
    }
    const title = String(json.title ?? "").trim();
    const body = String(json.body ?? "").trim();
    if (!body) {
      return Response.json({ ok: false, message: "Body is required." }, { status: 400 });
    }
    const editPatch = {
      title,
      body,
      is_edited: true,
      updated_at: now,
      moderation_notes: String(json.moderationNotes || "").trim() || null,
    };
    const { error } = await admin.from(TABLE).update(editPatch).eq("id", postId);
    if (error) {
      return Response.json({ ok: false, message: error.message || "Update failed." }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, message: "Invalid action." }, { status: 400 });
}
