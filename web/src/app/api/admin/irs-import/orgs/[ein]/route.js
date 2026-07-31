import { requirePlatformAdminMutation, requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

export const runtime = "nodejs";

const IRS_TABLE = "irs_eo_organizations";
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

  // `nonprofits_search_app_v1` is a materialized view — write `nonprofits`, then refresh.
  if (patch.directory_status === "approved") {
    const basePayload = {
      ein,
      name: data.org_name,
      city: data.city,
      state: data.state,
      ntee_code: data.ntee_code,
      subsection: data.irs_subsection,
      is_veteran_org: !!data.serves_veterans,
      is_first_responder_org: !!data.serves_first_responders,
      updated_at: new Date().toISOString(),
    };
    const existing = await ctx.admin.from("nonprofits").select("ein").eq("ein", ein).maybeSingle();
    if (existing.data?.ein) {
      await ctx.admin.from("nonprofits").update(basePayload).eq("ein", ein);
    } else {
      await ctx.admin.from("nonprofits").insert(basePayload);
    }
    await ctx.admin.rpc("refresh_nonprofits_search_app_v1");
  }

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
