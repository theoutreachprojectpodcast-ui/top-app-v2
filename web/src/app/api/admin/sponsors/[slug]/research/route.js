import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { researchSponsorWebsite } from "@/lib/sponsors/sponsorWebsiteResearch";

export const runtime = "nodejs";

/** POST — scrape sponsor website into enrichment.research_draft (never auto-publishes catalog). */
export async function POST(request, context) {
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-app-api-admin-sponsors-[slug]-research-post",
  });
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const slug = String(params?.slug || "").trim();
  if (!slug) {
    return Response.json({ ok: false, error: "missing_slug" }, { status: 400 });
  }

  const { data: sponsor, error: readError } = await ctx.admin
    .from("sponsors_catalog")
    .select("id, slug, name, display_name, website_url")
    .eq("slug", slug)
    .maybeSingle();

  if (readError) {
    return Response.json({ ok: false, error: readError.message }, { status: 500 });
  }
  if (!sponsor) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const website = String(body?.website_url || sponsor.website_url || "").trim();
  if (!website) {
    return Response.json({ ok: false, error: "missing_website_url" }, { status: 400 });
  }

  const result = await researchSponsorWebsite(website, {
    existingName: String(sponsor.display_name || sponsor.name || "").trim(),
  });
  if (!result.ok) {
    return Response.json(
      { ok: false, error: result.error || "research_failed", message: result.message || "Research failed." },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();
  const enrichPatch = {
    sponsor_id: sponsor.id,
    research_draft: result.draft,
    review_required: true,
    enrichment_status: "pending_review",
    last_enriched_at: now,
    updated_at: now,
  };

  const { data: enrichRow, error: enrichErr } = await ctx.admin
    .from("sponsor_enrichment")
    .upsert(enrichPatch, { onConflict: "sponsor_id" })
    .select("research_draft, last_enriched_at, enrichment_status")
    .maybeSingle();

  if (enrichErr) {
    return Response.json({ ok: false, error: enrichErr.message }, { status: 500 });
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.sponsors.slug.research.POST",
    resourceType: "admin_mutation",
    resourceId: slug,
    metadata: { route: "sponsors/[slug]/research" },
  });

  return Response.json({
    ok: true,
    draft: enrichRow?.research_draft || result.draft,
    warnings: result.warnings || [],
    enrichment_status: enrichRow?.enrichment_status || "pending_review",
    last_enriched_at: enrichRow?.last_enriched_at || now,
  });
}
