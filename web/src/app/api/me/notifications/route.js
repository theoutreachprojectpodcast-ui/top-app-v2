import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isCommunityModeratorServer } from "@/lib/community/moderatorServer";

export const runtime = "nodejs";

const TABLE = "torp_platform_notifications";

export async function GET(request) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ notifications: [], unreadCount: 0 });
  }

  const profile = await getProfileRowByWorkOSId(admin, user.id);
  if (!profile?.id) {
    return Response.json({ notifications: [], unreadCount: 0 });
  }

  const isStaffViewer = isCommunityModeratorServer({
    email: profile.email,
    workosUserId: user.id,
    profileRow: profile,
  });

  const url = new URL(request.url);
  if (url.searchParams.get("summary") === "1") {
    let q = admin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("recipient_profile_id", profile.id)
      .eq("status", "unread");
    if (!isStaffViewer) q = q.eq("audience_scope", "user");
    const { count, error } = await q;
    if (error) {
      return Response.json({ unreadCount: 0, error: error.message }, { status: 500 });
    }
    return Response.json({ unreadCount: typeof count === "number" ? count : 0 });
  }

  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const cursor = url.searchParams.get("cursor");
  let q = admin
    .from(TABLE)
    .select("id,notification_type,title,message,link_path,entity_type,entity_id,status,priority,read_at,created_at,metadata,audience_scope")
    .eq("recipient_profile_id", profile.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (!isStaffViewer) q = q.eq("audience_scope", "user");

  if (cursor) {
    q = q.lt("created_at", cursor);
  }

  const { data: rows, error } = await q;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const list = rows || [];
  const hasMore = list.length > limit;
  const slice = hasMore ? list.slice(0, limit) : list;
  const nextCursor = hasMore && slice.length ? slice[slice.length - 1].created_at : null;

  let unreadQ = admin
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("recipient_profile_id", profile.id)
    .eq("status", "unread");
  if (!isStaffViewer) unreadQ = unreadQ.eq("audience_scope", "user");
  const { count: unreadCount } = await unreadQ;

  return Response.json({
    notifications: slice,
    unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    nextCursor,
  });
}

export async function PATCH(request) {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);
  const user = auth.user;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_unavailable" }, { status: 503 });
  }

  const profile = await getProfileRowByWorkOSId(admin, user.id);
  if (!profile?.id) {
    return Response.json({ error: "profile_required" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const isStaffViewer = isCommunityModeratorServer({
    email: profile.email,
    workosUserId: user.id,
    profileRow: profile,
  });

  if (body.markAllRead) {
    let q = admin
      .from(TABLE)
      .update({ status: "read", read_at: now, updated_at: now })
      .eq("recipient_profile_id", profile.id)
      .eq("status", "unread");
    if (!isStaffViewer) q = q.eq("audience_scope", "user");
    const { error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map((x) => String(x)).filter(Boolean) : [];
  if (!ids.length) {
    return Response.json({ error: "ids_required" }, { status: 400 });
  }

  let markQ = admin
    .from(TABLE)
    .update({ status: "read", read_at: now, updated_at: now })
    .eq("recipient_profile_id", profile.id)
    .in("id", ids);
  if (!isStaffViewer) markQ = markQ.eq("audience_scope", "user");
  const { error } = await markQ;

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
