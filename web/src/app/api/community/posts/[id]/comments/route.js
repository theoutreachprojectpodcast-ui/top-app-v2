import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import {
  ensureTopProfilesShadowForComment,
  listPublishedCommentsForPost,
  loadPostForComments,
  profileRowToCommentAuthor,
} from "@/lib/community/communityPostCommentsServer";

export async function GET(_request, context) {
  const admin = createSupabaseAdminClient();
  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ comments: [], error: "missing_id", message: "Missing post id." }, { status: 400 });
  }
  if (!admin) {
    return Response.json({ comments: [], warning: "storage_unavailable" });
  }

  const post = await loadPostForComments(admin, postId);
  if (!post) {
    return Response.json(
      { comments: [], error: "not_found", message: "This post is not available for comments." },
      { status: 404 },
    );
  }
  if (post.commentsClosed) {
    return Response.json({ comments: [], commentsEnabled: false });
  }

  const result = await listPublishedCommentsForPost(admin, postId);
  if (!result.ok) {
    return Response.json(
      { comments: [], error: "query_failed", message: result.error || "Could not load comments." },
      { status: 500 },
    );
  }

  return Response.json({ comments: result.comments, commentsEnabled: true });
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

  const post = await loadPostForComments(admin, postId);
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

  await ensureTopProfilesShadowForComment(admin, profileRow);

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
    .from("community_post_comments")
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

  const { authorName, authorAvatarUrl } = profileRowToCommentAuthor(profileRow);

  return Response.json({
    ok: true,
    comment: {
      id: data?.id,
      postId,
      profileId: profileRow.id,
      body,
      status: "published",
      createdAt: data?.created_at || now,
      authorName,
      authorAvatarUrl,
    },
  });
}
