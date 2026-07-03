import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { validateBlockForPublish } from "@/lib/admin/contentPublishValidation";
import { normalizeBlockPayload, TABLE } from "@/lib/admin/pageContentBlocks";
import { htmlToPlainText } from "@/lib/admin/sanitizeHtml";

export const runtime = "nodejs";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const pageKey = String(url.searchParams.get("page_key") || "").trim();
  const status = String(url.searchParams.get("status") || "").trim();

  let q = ctx.admin.from(TABLE).select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false }).limit(300);
  if (pageKey) q = q.eq("page_key", pageKey);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, rows: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-page-content-blocks-post" });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const payload = normalizeBlockPayload(body, ctx.user?.id);
  if (!payload.page_key) {
    return Response.json({ ok: false, error: "page_key_required" }, { status: 400 });
  }
  if (!payload.body_html && !payload.body_text && !payload.title) {
    return Response.json({ ok: false, error: "content_required" }, { status: 400 });
  }
  if (!payload.body_text && payload.body_html) {
    payload.body_text = htmlToPlainText(payload.body_html).slice(0, 20000);
  }

  const publishCheck = validateBlockForPublish(payload);
  if (!publishCheck.ok) {
    return Response.json({ ok: false, error: "publish_validation_failed", details: publishCheck.errors }, { status: 400 });
  }

  payload.created_by = String(ctx.user?.id || "").trim() || null;

  const { data, error } = await ctx.admin.from(TABLE).insert(payload).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.page-content-blocks.create",
    resourceType: "page_content_block",
    resourceId: String(data?.id || ""),
    metadata: { page_key: payload.page_key, block_type: payload.block_type },
  });

  return Response.json({ ok: true, row: data });
}
