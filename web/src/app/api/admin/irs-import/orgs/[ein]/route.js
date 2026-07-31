import { requirePlatformAdminMutation, requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

export const runtime = "nodejs";

const IRS_TABLE = "irs_eo_organizations";
const DIRECTORY_TABLE = "nonprofits_search_app_v1";
const ALLOWED_STATUS = new Set(["pending_review", "approved", "hidden", "rejected"]);

export async function GET(_request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const ein = normalizeEinDigits(params?.ein || "");
  if (ein.length !== 9) return Response.json({ ok: false, error: "invalid_ein" }, { status: 400 });

  const { data, error } = await ctx.admin.from(IRS_TABLE).select("*").eq("ein", ein).maybeSingle();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  return Response.json({ ok: true, org: data });
}

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-irs-import-org-patch" });
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const ein = normalizeEinDigits(params?.ein || "");
  if (ein.length !== 9) return Response.json({ ok: false, error: "invalid_ein" }, { status: 400 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch = { updated_at: new Date().toISOString(), last_verified_at: new Date().toISOString() };

  if (body.directory_status != null) {
    const status = String(body.directory_status).trim();
    if (!ALLOWED_STATUS.has(status)) {
      return Response.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    patch.directory_status = status;
  }

  // Featured/trusted only via explicit admin action — never implied by approval alone.
  if (typeof body.is_featured === "boolean") patch.is_featured = body.is_featured;
  if (typeof body.is_trusted === "boolean") patch.is_trusted = body.is_trusted;

  if (typeof body.website === "string") patch.website = body.website.trim() || null;
  if (typeof body.phone === "string") patch.phone = body.phone.trim() || null;
  if (typeof body.description === "string") patch.description = body.description.trim() || null;

  const { data, error } = await ctx.admin.from(IRS_TABLE).update(patch).eq("ein", ein).select("*").maybeSingle();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  // Mirror review status into public directory table (best-effort).
  const dirPatch = {
    directory_status: data.directory_status,
    is_featured: data.is_featured,
    is_trusted: data.is_trusted,
    last_verified_at: data.last_verified_at,
    updated_at: data.updated_at,
  };
  if (patch.website !== undefined) dirPatch.website = data.website;
  if (patch.phone !== undefined) dirPatch.phone = data.phone;
  if (patch.description !== undefined) dirPatch.description = data.description;

  const dashed = `${ein.slice(0, 2)}-${ein.slice(2)}`;
  await ctx.admin.from(DIRECTORY_TABLE).update(dirPatch).eq("ein", ein);
  await ctx.admin.from(DIRECTORY_TABLE).update(dirPatch).eq("ein", dashed);

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.irs_import.org.PATCH",
    resourceType: "irs_eo_organizations",
    resourceId: ein,
    metadata: { patch },
  });

  return Response.json({ ok: true, org: data });
}
