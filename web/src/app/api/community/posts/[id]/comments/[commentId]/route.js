import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";

const COMMENTS = "community_post_comments";

export async function PATCH(request, context) {
  const guard = guardMutation(request, { rateKey: "community-comment-mod", limit: 60 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, message: "Server unavailable." }, { status: 503 });
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
  if (!mod && !platAdmin) {
    return Response.json({ ok: false, message: "Moderator access required." }, { status: 403 });
  }

  const params = await context.params;
  const commentId = String(params?.commentId || "").trim();
  if (!commentId) {
    return Response.json({ ok: false, message: "Missing comment id." }, { status: 400 });
  }

  let json;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const action = String(json.action || json.status || "").toLowerCase();
  const now = new Date().toISOString();
  let status = "";
  if (action === "hide" || action === "hidden") status = "hidden";
  else if (action === "delete" || action === "deleted") status = "deleted";
  else if (action === "publish" || action === "published" || action === "restore") status = "published";
  else {
    return Response.json({ ok: false, message: "Invalid action." }, { status: 400 });
  }

  const { error } = await admin
    .from(COMMENTS)
    .update({ status, updated_at: now })
    .eq("id", commentId);

  if (error) {
    return Response.json({ ok: false, message: error.message || "Update failed." }, { status: 500 });
  }

  return Response.json({ ok: true, status });
}

export async function GET(request, context) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ comments: [], warning: "storage_unavailable" });
  }

  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  const platAdmin = isPlatformAdminServer({
    email: auth.user.email,
    workosUserId: auth.user.id,
    profileRow,
  });
  const mod = isCommunityModeratorServer({
    email: auth.user.email,
    workosUserId: auth.user.id,
    profileRow,
  });
  if (!mod && !platAdmin) {
    return Response.json({ comments: [], error: "forbidden" }, { status: 403 });
  }

  const params = await context.params;
  const postId = String(params?.id || "").trim();
  const commentId = String(params?.commentId || "").trim();
  if (!postId || !commentId) {
    return Response.json({ comments: [], error: "missing_id" }, { status: 400 });
  }

  const { data, error } = await admin
    .from(COMMENTS)
    .select("id,post_id,profile_id,body,status,created_at,updated_at")
    .eq("id", commentId)
    .eq("post_id", postId)
    .maybeSingle();

  if (error) {
    return Response.json({ comment: null, error: error.message }, { status: 500 });
  }

  return Response.json({ comment: data });
}
