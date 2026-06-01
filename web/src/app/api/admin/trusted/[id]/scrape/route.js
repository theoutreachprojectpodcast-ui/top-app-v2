import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { scrapeTrustedResourceWebsite } from "@/lib/trusted/trustedResourceWebsiteScrape";

export const runtime = "nodejs";

/** POST — fetch public website metadata and persist on the trusted_resources row. */
export async function POST(_request, context, request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-app-api-admin-trusted-[id]-scrape-post" });
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const id = String(params?.id || "").trim();
  if (!id) {
    return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const { data: row, error: readError } = await ctx.admin
    .from("trusted_resources")
    .select("id, website_url, long_description, mission, logo_url, detail_field_sources")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return Response.json({ ok: false, error: readError.message }, { status: 500 });
  }
  if (!row) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const website = String(row.website_url || "").trim();
  if (!website) {
    return Response.json({ ok: false, error: "missing_website_url" }, { status: 400 });
  }

  const scraped = await scrapeTrustedResourceWebsite(website);
  if (!scraped) {
    return Response.json({ ok: false, error: "scrape_empty" }, { status: 422 });
  }

  const sources = {
    ...(row.detail_field_sources && typeof row.detail_field_sources === "object"
      ? row.detail_field_sources
      : {}),
    ...(scraped.detail_field_sources || {}),
  };

  const patch = {
    updated_at: new Date().toISOString(),
    detail_scraped_at: scraped.detail_scraped_at,
    detail_field_sources: sources,
  };

  if (scraped.long_description && !String(row.long_description || "").trim()) {
    patch.long_description = scraped.long_description;
  }
  if (scraped.mission && !String(row.mission || "").trim()) {
    patch.mission = scraped.mission;
  }
  if (scraped.logo_url && !String(row.logo_url || "").trim()) {
    patch.logo_url = scraped.logo_url;
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

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.trusted.id.scrape.POST",
    resourceType: "admin_mutation",
    resourceId: null,
    metadata: { route: "trusted/[id]/scrape" },
  });
  return Response.json({ ok: true, row: data, scraped: patch });
}
