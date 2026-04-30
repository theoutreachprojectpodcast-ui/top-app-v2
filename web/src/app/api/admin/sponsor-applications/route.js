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

  const patch = {
    application_status,
    internal_notes,
    reviewed_at: new Date().toISOString(),
    invoice_amount_cents: Number.parseInt(String(body.invoice_amount_cents || ""), 10) || null,
    invoice_reason: body.invoice_reason ? String(body.invoice_reason).trim() : null,
    invoice_url: body.invoice_url ? String(body.invoice_url).trim() : null,
    payment_status: body.payment_status ? String(body.payment_status).trim() : "submitted",
    onboarding_status: body.onboarding_status ? String(body.onboarding_status).trim() : application_status,
  };
  if (patch.invoice_url) patch.invoice_sent_at = new Date().toISOString();

  const { data: updated, error } = await ctx.admin
    .from(TABLE)
    .update(patch)
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (String(body.action || "").trim() !== "convert_to_sponsor") {
    return Response.json({ ok: true, row: updated || null });
  }

  const { data: app, error: appError } = await ctx.admin.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (appError || !app) {
    return Response.json({ ok: false, error: appError?.message || "application_not_found_after_update" }, { status: 500 });
  }
  const slug = String(app.sponsor_slug || app.company_name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) {
    return Response.json({ ok: false, error: "missing_sponsor_slug" }, { status: 400 });
  }

  const sponsorPayload = {
    slug,
    name: String(app.company_name || app.contact_name || "Sponsor"),
    sponsor_type: String(app.sponsor_type_requested || "Sponsor"),
    sponsor_scope: String(body.sponsor_scope || "app"),
    website_url: String(app.website_url || ""),
    logo_url: String(app.logo_url || ""),
    background_image_url: String(app.background_image_url || ""),
    short_description: String(app.description || ""),
    long_description: String(app.description || ""),
    is_active: true,
    sponsor_status: "active",
    payment_status: String(app.payment_status || "submitted"),
    onboarding_status: String(app.onboarding_status || "submitted"),
    updated_at: new Date().toISOString(),
  };
  const { data: sponsorRow, error: sponsorError } = await ctx.admin
    .from("sponsors_catalog")
    .upsert(sponsorPayload, { onConflict: "slug" })
    .select("id, slug")
    .single();
  if (sponsorError) {
    return Response.json({ ok: false, error: sponsorError.message }, { status: 500 });
  }

  await ctx.admin.from(TABLE).update({ sponsor_slug: slug, sponsor_catalog_id: sponsorRow.id }).eq("id", id);
  return Response.json({ ok: true, sponsor: sponsorRow });
}
