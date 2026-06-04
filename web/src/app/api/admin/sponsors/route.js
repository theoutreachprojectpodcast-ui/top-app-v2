import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { uniqueSponsorSlug } from "@/lib/sponsors/sponsorSlug";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.admin
    .from("sponsors_catalog")
    .select("*")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, rows: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-sponsors-create" });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = String(body?.name || "").trim();
  if (!name) {
    return Response.json({ ok: false, error: "name_required" }, { status: 400 });
  }

  const slug = body?.slug ? String(body.slug).trim().toLowerCase() : await uniqueSponsorSlug(ctx.admin, name);
  const now = new Date().toISOString();

  const row = {
    slug,
    name,
    display_name: String(body.display_name || name).trim() || name,
    sponsor_type: String(body.sponsor_type || "mission_partner_sponsor").trim() || "mission_partner_sponsor",
    sponsor_display_group: String(body.sponsor_display_group || "mission_partner").trim() || "mission_partner",
    sponsor_category: String(body.sponsor_category || "").trim() || null,
    website_url: String(body.website_url || "").trim() || null,
    logo_url: String(body.logo_url || "").trim() || null,
    background_image_url: String(body.background_image_url || "").trim() || null,
    short_description: String(body.short_description || "").trim() || null,
    long_description: String(body.long_description || "").trim() || null,
    tagline: String(body.tagline || "").trim() || null,
    featured: Boolean(body.featured),
    mission_partner: body.mission_partner !== false,
    is_active: body.is_active !== false,
    sponsor_status: String(body.sponsor_status || "active").trim() || "active",
    sponsor_scope: String(body.sponsor_scope || "app").trim() || "app",
    display_order: parseInt(String(body.display_order ?? 0), 10) || 0,
    verified: Boolean(body.verified),
    enrichment_status: "manual",
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await ctx.admin.from("sponsors_catalog").insert(row).select("*").maybeSingle();
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.sponsors.POST",
    resourceType: "sponsors_catalog",
    resourceId: slug,
    metadata: { slug },
  });

  return Response.json({ ok: true, row: data }, { status: 201 });
}
