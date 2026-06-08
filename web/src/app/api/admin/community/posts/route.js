import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { sanitizeAdminHtml, htmlToPlainText } from "@/lib/admin/sanitizeHtml";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";

export const runtime = "nodejs";

const TABLE = "community_posts";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const scope = String(url.searchParams.get("scope") || "all").toLowerCase();

  let query = ctx.admin.from(TABLE).select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(200);

  if (scope === "draft") {
    query = query.eq("status", "draft");
  } else if (scope === "published") {
    query = query.eq("status", "approved");
  } else if (scope === "pending") {
    query = query.in("status", ["pending_review", "submitted", "under_review", "in_review"]);
  } else if (scope === "rejected") {
    query = query.eq("status", "rejected");
  } else if (scope === "bookmarked") {
    query = query.eq("admin_bookmark", true);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, posts: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-community-create" });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const title = String(body?.title || "").trim().slice(0, 200);
  const rawBody = String(body?.body || "").trim();
  const text = sanitizeAdminHtml(rawBody);
  const plainLen = htmlToPlainText(text).length;
  if (plainLen < 10) {
    return Response.json({ ok: false, error: "body_too_short" }, { status: 400 });
  }
  if (text.length > 20000) {
    return Response.json({ ok: false, error: "body_too_long" }, { status: 400 });
  }

  const profileRow = await getProfileRowByWorkOSId(ctx.admin, ctx.user.id);
  const authorName = String(body?.author_name || profileRow?.display_name || ctx.user.email || "The Outreach Project").trim();
  const publish = body?.publish === true || String(body?.status || "").toLowerCase() === "approved";
  const now = new Date().toISOString();

  const row = {
    author_id: String(ctx.user.id),
    author_profile_id: profileRow?.id || null,
    author_name: authorName,
    author_avatar_url: String(profileRow?.profile_photo_url || "").trim(),
    title,
    body: text,
    category: String(body?.category || "admin_update").slice(0, 64),
    post_type: String(body?.post_type || "admin_update").slice(0, 64),
    link_url: String(body?.link_url || "").trim().slice(0, 500),
    photo_url: typeof body?.photo_url === "string" ? body.photo_url.trim().slice(0, 120000) : "",
    show_author_name: body?.show_author_name !== false,
    visibility: "community",
    status: publish ? "approved" : "draft",
    published_at: publish ? now : null,
    featured: Boolean(body?.featured),
    is_edited: false,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await ctx.admin.from(TABLE).insert(row).select("*").maybeSingle();
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.community.posts.POST",
    resourceType: "community_posts",
    resourceId: String(data?.id || ""),
    metadata: { status: row.status },
  });

  return Response.json({ ok: true, post: data }, { status: 201 });
}
