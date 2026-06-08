import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { safeUploadObjectPath, validateImageUpload } from "@/lib/security/uploadPolicy";

export const runtime = "nodejs";

const BUCKET = "admin-media";
const TABLE = "admin_media_assets";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-media-upload" });
  if (!ctx.ok) return ctx.response;

  if (!ctx.admin) {
    return Response.json({ ok: false, error: "server_storage_unavailable" }, { status: 503 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  const validated = await validateImageUpload(file, { maxBytes: MAX_BYTES });
  if (!validated.ok) {
    return Response.json({ ok: false, error: validated.error }, { status: validated.status });
  }

  const altText = String(form.get("alt_text") || "").trim().slice(0, 300);
  const tagsRaw = String(form.get("tags") || "").trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const path = safeUploadObjectPath(`admin-${ctx.user?.id || "asset"}`, validated.ext);
  const { error: upErr } = await ctx.admin.storage.from(BUCKET).upload(path, validated.buffer, {
    contentType: validated.mime,
    upsert: false,
  });
  if (upErr) {
    return Response.json({ ok: false, error: "upload_failed", message: upErr.message }, { status: 500 });
  }

  const { data: pub } = ctx.admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl || "";
  if (!publicUrl) {
    return Response.json({ ok: false, error: "public_url_failed" }, { status: 500 });
  }

  const row = {
    storage_path: path,
    public_url: publicUrl,
    filename: String(file?.name || path).slice(0, 255),
    mime_type: validated.mime,
    byte_size: validated.buffer.length,
    alt_text: altText,
    tags,
    created_by: String(ctx.user?.id || "").trim() || null,
  };

  const { data, error } = await ctx.admin.from(TABLE).insert(row).select("*").single();
  if (error) {
    return Response.json({
      ok: true,
      publicUrl,
      warning: "upload_ok_registry_failed",
      message: error.message,
    });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.media-library.upload",
    resourceType: "admin_media_asset",
    resourceId: String(data?.id || ""),
    metadata: { filename: row.filename },
  });

  return Response.json({ ok: true, publicUrl, asset: data });
}
