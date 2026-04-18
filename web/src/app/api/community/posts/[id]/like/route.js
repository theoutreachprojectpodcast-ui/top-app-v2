import { withAuth } from "@workos-inc/authkit-nextjs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";

const POSTS = "community_posts";
const REACTIONS = "community_post_reactions";

export async function POST(request, context) {
  const auth = await withAuth();
  if (!auth.user) {
    return Response.json({ ok: false, message: "Sign in to like posts." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Unavailable" }, { status: 503 });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!profileRow?.id) {
    return Response.json({ ok: false, message: "Profile required." }, { status: 403 });
  }

  const params = await context.params;
  const postId = String(params?.id || "").trim();
  if (!postId) {
    return Response.json({ ok: false, message: "Missing post." }, { status: 400 });
  }

  const { data: post, error: postErr } = await admin.from(POSTS).select("id,status").eq("id", postId).maybeSingle();
  if (postErr || !post) {
    return Response.json({ ok: false, message: "Post not found." }, { status: 404 });
  }
  if (post.status !== "approved") {
    return Response.json({ ok: false, message: "Only approved posts can be liked." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from(REACTIONS)
    .select("id")
    .eq("post_id", postId)
    .eq("profile_id", profileRow.id)
    .eq("reaction_type", "like")
    .maybeSingle();

  if (existing?.id) {
    await admin.from(REACTIONS).delete().eq("id", existing.id);
  } else {
    const { error: insErr } = await admin.from(REACTIONS).insert({
      post_id: postId,
      profile_id: profileRow.id,
      reaction_type: "like",
    });
    if (insErr) {
      return Response.json({ ok: false, message: insErr.message }, { status: 500 });
    }
  }

  const { count, error: cntErr } = await admin
    .from(REACTIONS)
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("reaction_type", "like");

  if (!cntErr && typeof count === "number") {
    await admin.from(POSTS).update({ like_count: count, updated_at: new Date().toISOString() }).eq("id", postId);
  }

  const liked = !existing?.id;
  return Response.json({ ok: true, liked, likeCount: count ?? 0 });
}
