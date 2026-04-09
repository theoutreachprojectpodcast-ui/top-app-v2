import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";

const TABLE = "community_posts";

export async function PATCH(request, context) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!isCommunityModeratorServer({ email: auth.user.email, workosUserId: auth.user.id })) {
    return Response.json({ ok: false, message: "Moderator access required." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Server storage unavailable." }, { status: 503 });
  }

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

  const patch = { updated_at: now, reviewed_by: auth.user.id, reviewed_at: now };

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

  return Response.json({ ok: true });
}
