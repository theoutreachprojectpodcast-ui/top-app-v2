import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { validateContentPublishTransition } from "@/lib/admin/contentPublishValidation";
import { patchBlockPayload, TABLE } from "@/lib/admin/pageContentBlocks";
import { htmlToPlainText } from "@/lib/admin/sanitizeHtml";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-page-content-blocks-patch" });
  if (!ctx.ok) return ctx.response;

  const id = String((await params)?.id || "").trim();
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const payload = patchBlockPayload(body, ctx.user?.id);
  if (payload.body_html && !payload.body_text) {
    payload.body_text = htmlToPlainText(payload.body_html).slice(0, 20000);
  }

  const { data: existing } = await ctx.admin.from(TABLE).select("*").eq("id", id).maybeSingle();
  const publishCheck = validateContentPublishTransition(existing, payload);
  if (!publishCheck.ok) {
    return Response.json({ ok: false, error: "publish_validation_failed", details: publishCheck.errors }, { status: 400 });
  }

  const { data, error } = await ctx.admin.from(TABLE).update(payload).eq("id", id).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.page-content-blocks.update",
    resourceType: "page_content_block",
    resourceId: id,
    metadata: { status: payload.status },
  });

  return Response.json({ ok: true, row: data });
}

export async function DELETE(request, { params }) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-page-content-blocks-delete" });
  if (!ctx.ok) return ctx.response;

  const id = String((await params)?.id || "").trim();
  if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

  const { error } = await ctx.admin.from(TABLE).delete().eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.page-content-blocks.delete",
    resourceType: "page_content_block",
    resourceId: id,
    metadata: {},
  });

  return Response.json({ ok: true });
}
