import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";

export const runtime = "nodejs";

const KEYS = new Set([
  "name",
  "sponsor_type",
  "website_url",
  "logo_url",
  "background_image_url",
  "short_description",
  "long_description",
  "tagline",
  "instagram_url",
  "facebook_url",
  "linkedin_url",
  "twitter_url",
  "youtube_url",
  "featured",
  "display_order",
  "verified",
]);

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const slug = String(params?.slug || "").trim();
  if (!slug) {
    return Response.json({ ok: false, error: "missing_slug" }, { status: 400 });
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
    if (k === "featured" || k === "verified") {
      patch[k] = Boolean(v);
    } else if (k === "display_order") {
      const n = parseInt(String(v), 10);
      if (Number.isFinite(n)) patch[k] = n;
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
    .from("sponsors_catalog")
    .update(patch)
    .eq("slug", slug)
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
