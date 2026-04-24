import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { SPONSOR_REVIEW_STATUSES } from "@/features/sponsors/admin/reviewStatuses";

const TABLE = "sponsor_applications";
const STATUS_SET = new Set(SPONSOR_REVIEW_STATUSES);

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(200);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ records: data || [] });
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = String(body.id || "").trim();
  const application_status = String(body.application_status || "").trim();
  const internal_notes = String(body.internal_notes || "").trim();
  if (!id || !STATUS_SET.has(application_status)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { error } = await ctx.admin
    .from(TABLE)
    .update({
      application_status,
      internal_notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
