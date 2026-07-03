import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";

export const runtime = "nodejs";

function manualEin() {
  const n = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0");
  return `MANUAL${n}`.slice(0, 20);
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.admin
    .from("trusted_resources")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })
    .limit(500);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, rows: data || [] });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-trusted-create" });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const displayName = String(body?.display_name || "").trim();
  if (!displayName) {
    return Response.json({ ok: false, error: "display_name_required" }, { status: 400 });
  }

  const ein = String(body?.ein || manualEin()).trim().slice(0, 32) || manualEin();
  const now = new Date().toISOString();
  const row = {
    ein,
    display_name: displayName,
    website_url: String(body?.website_url || "").trim() || null,
    logo_url: String(body?.logo_url || "").trim() || null,
    header_image_url: String(body?.header_image_url || "").trim() || null,
    short_description: String(body?.short_description || "").trim() || null,
    instagram_url: String(body?.instagram_url || "").trim() || null,
    facebook_url: String(body?.facebook_url || "").trim() || null,
    linkedin_url: String(body?.linkedin_url || "").trim() || null,
    x_url: String(body?.x_url || "").trim() || null,
    youtube_url: String(body?.youtube_url || "").trim() || null,
    listing_status: ["pending", "active", "archived"].includes(String(body?.listing_status || ""))
      ? String(body.listing_status)
      : "pending",
    sort_order: parseInt(String(body?.sort_order || "0"), 10) || 0,
    featured: Boolean(body?.featured),
    city: String(body?.city || "").trim() || null,
    state: String(body?.state || "").trim() || null,
    category_key: String(body?.category_key || "").trim() || null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await ctx.admin.from("trusted_resources").insert(row).select("*").single();
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.trusted.POST",
    resourceType: "trusted_resources",
    resourceId: data?.id || null,
    metadata: { ein },
  });

  return Response.json({ ok: true, row: data });
}
