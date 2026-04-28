import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { createPlatformNotification } from "@/server/notifications/notificationService";

const TABLE = "community_posts";

export async function PATCH(request, context) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Server storage unavailable." }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  const mod = isCommunityModeratorServer({
    email: auth.user.email,
    workosUserId: auth.user.id,
    profileRow,
  });
  const platAdmin = isPlatformAdminServer({
    email: auth.user.email,
    workosUserId: auth.user.id,
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
    .select("id,author_profile_id,title,body")
    .eq("id", postId)
    .maybeSingle();
  if (loadPostErr || !existingPost) {
    return Response.json({ ok: false, message: "Post not found." }, { status: 404 });
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

  const patch = { updated_at: now, reviewed_by: auth.user.id, reviewed_at: now };

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

  if (!mod) {
    return Response.json({ ok: false, message: "Moderator access required." }, { status: 403 });
  }

  if (action === "approve") {
    patch.status = "approved";
    patch.published_at = now;
    patch.rejection_reason = null;
  } else if (action === "reject") {
    patch.status = "rejected";
    patch.rejection_reason = String(json.rejectionReason || "").trim() || "Did not meet moderation guidelines.";
    patch.moderation_notes = String(json.moderationNotes || "").trim() || null;
  } else if (action === "hide") {
    patch.status = "hidden";
    patch.moderation_notes = String(json.moderationNotes || "").trim() || null;
  } else {
    return Response.json({ ok: false, message: "Invalid action." }, { status: 400 });
  }

  const { error } = await admin.from(TABLE).update(patch).eq("id", postId);

  if (error) {
    return Response.json({ ok: false, message: error.message || "Update failed." }, { status: 500 });
  }

  if (action === "approve" && existingPost.author_profile_id) {
    const snippet = String(existingPost.title || existingPost.body || "").trim().slice(0, 120);
    await createPlatformNotification(admin, {
      recipientProfileId: existingPost.author_profile_id,
      audienceScope: "user",
      type: "community_post_approved",
      title: "Your community story is live",
      message: snippet
        ? `“${snippet}${snippet.length >= 120 ? "…" : ""}” is now visible in the community feed.`
        : "Your post was approved and is visible in the community feed.",
      linkPath: "/community",
      entityType: "community_post",
      entityId: postId,
      metadata: { post_id: postId },
    });
  }

  return Response.json({ ok: true });
}
