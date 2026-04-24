import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";

export const runtime = "nodejs";

const DIRECTORY = "nonprofits_search_app_v1";
const ENRICH = "nonprofit_directory_enrichment";

const ENRICH_PATCH_KEYS = new Set([
  "logo_url",
  "hero_image_url",
  "thumbnail_url",
  "header_image_url",
  "website_url",
  "facebook_url",
  "instagram_url",
  "linkedin_url",
  "x_url",
  "youtube_url",
  "tiktok_url",
  "headline",
  "tagline",
  "short_description",
  "long_description",
  "mission_statement",
]);

export async function GET(request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const ein9 = normalizeEinDigits(params?.ein || "");
  if (ein9.length !== 9) {
    return Response.json({ ok: false, error: "invalid_ein" }, { status: 400 });
  }

  const dashed = `${ein9.slice(0, 2)}-${ein9.slice(2)}`;

  let org = null;
  const r1 = await ctx.admin.from(DIRECTORY).select("*").eq("ein", ein9).maybeSingle();
  if (r1.data) org = r1.data;
  if (!org) {
    const r2 = await ctx.admin.from(DIRECTORY).select("*").eq("ein", dashed).maybeSingle();
    org = r2.data || null;
  }

  const { data: enrichment } = await ctx.admin.from(ENRICH).select("*").eq("ein", ein9).maybeSingle();

  return Response.json({ ok: true, ein: ein9, directory: org, enrichment: enrichment || null });
}

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const ein9 = normalizeEinDigits(params?.ein || "");
  if (ein9.length !== 9) {
    return Response.json({ ok: false, error: "invalid_ein" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const patch = { ein: ein9, updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body || {})) {
    if (!ENRICH_PATCH_KEYS.has(k)) continue;
    if (v === null) {
      patch[k] = null;
    } else if (typeof v === "string") {
      patch[k] = v.trim() || null;
    }
  }

  if (Object.keys(patch).length <= 2) {
    return Response.json({ ok: false, error: "no_valid_fields" }, { status: 400 });
  }

  const { data, error } = await ctx.admin.from(ENRICH).upsert(patch, { onConflict: "ein" }).select("*").maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, enrichment: data });
}
