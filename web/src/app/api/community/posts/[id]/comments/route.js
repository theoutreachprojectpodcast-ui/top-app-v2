import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";

const POSTS = "community_posts";
const COMMENTS = "community_post_comments";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} postId
 */
async function loadPublishedPostForComments(admin, postId) {
  const { data, error } = await admin
    .from(POSTS)
    .select("id,status,comments_enabled,deleted_at")
    .eq("id", postId)
    .maybeSingle();
  if (error || !data || data.deleted_at) return null;
  if (String(data.status || "").toLowerCase() !== "approved") return null;
  if (data.comments_enabled === false) return { ...data, commentsClosed: true };
  return data;
}

export async function GET(_request, context) {
  const admin = createSupabaseAdminClient();
  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ comments: [], error: "missing_id" }, { status: 400 });
  }
  if (!admin) {
    return Response.json({ comments: [], warning: "storage_unavailable" });
  }

  const post = await loadPublishedPostForComments(admin, postId);
  if (!post) {
    return Response.json({ comments: [], error: "not_found" }, { status: 404 });
  }
  if (post.commentsClosed) {
    return Response.json({ comments: [], commentsEnabled: false });
  }

  const { data, error } = await admin
    .from(COMMENTS)
    .select(
      `
      id,
      post_id,
      profile_id,
      body,
      status,
      created_at,
      updated_at,
      torp_profiles:profile_id (
        display_name,
        first_name,
        last_name,
        profile_photo_url
      )
    `,
    )
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return Response.json({ comments: [], error: error.message }, { status: 500 });
  }

  const comments = (data || []).map((row) => {
    const prof = row.torp_profiles && typeof row.torp_profiles === "object" ? row.torp_profiles : {};
    const name =
      [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim() ||
      String(prof.display_name || "").trim() ||
      "Member";
    return {
      id: row.id,
      postId: row.post_id,
      profileId: row.profile_id,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: name,
      authorAvatarUrl: String(prof.profile_photo_url || ""),
    };
  });

  return Response.json({ comments, commentsEnabled: true });
}

export async function POST(request, context) {
  const guard = guardMutation(request, { rateKey: "community-comment", limit: 40 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Comments are not available right now." }, { status: 503 });
  }

  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ ok: false, message: "Missing post id." }, { status: 400 });
  }

  const post = await loadPublishedPostForComments(admin, postId);
  if (!post) {
    return Response.json({ ok: false, message: "Post not found." }, { status: 404 });
  }
  if (post.commentsClosed) {
    return Response.json({ ok: false, message: "Comments are closed on this post." }, { status: 403 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id) {
    return Response.json({ ok: false, message: "Finish onboarding before commenting." }, { status: 403 });
  }

  let json;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const body = String(json.body || "").trim();
  if (body.length < 2) {
    return Response.json({ ok: false, message: "Comment is too short." }, { status: 400 });
  }
  if (body.length > 4000) {
    return Response.json({ ok: false, message: "Comment is too long (max 4,000 characters)." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from(COMMENTS)
    .insert({
      post_id: postId,
      profile_id: profileRow.id,
      body,
      status: "published",
      created_at: now,
      updated_at: now,
    })
    .select("id,created_at")
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, message: error.message || "Could not post comment." }, { status: 500 });
  }

  const displayName =
    [profileRow.first_name, profileRow.last_name].filter(Boolean).join(" ").trim() ||
    String(profileRow.display_name || "").trim() ||
    "Member";

  return Response.json({
    ok: true,
    comment: {
      id: data?.id,
      postId,
      profileId: profileRow.id,
      body,
      status: "published",
      createdAt: data?.created_at || now,
      authorName: displayName,
      authorAvatarUrl: String(profileRow.profile_photo_url || ""),
    },
  });
}
