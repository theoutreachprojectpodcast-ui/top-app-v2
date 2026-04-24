import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

const KEYS = new Set([
  "display_name",
  "website_url",
  "logo_url",
  "header_image_url",
  "header_image_source_url",
  "short_description",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "x_url",
  "linkedin_url",
  "listing_status",
  "sort_order",
  "city",
  "state",
  "location_label",
  "category_key",
]);

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const id = String(params?.id || "").trim();
  if (!id) {
    return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body || {})) {
    if (!KEYS.has(k)) continue;
    if (k === "sort_order") {
      const n = parseInt(String(v), 10);
      if (!Number.isFinite(n)) continue;
      patch[k] = n;
    } else if (typeof v === "string") {
      patch[k] = v.trim() || null;
    } else if (v === null) {
      patch[k] = null;
    }
  }

  if (Object.keys(patch).length <= 1) {
    return Response.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from("trusted_resources")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return Response.json({ ok: true, row: data });
}
