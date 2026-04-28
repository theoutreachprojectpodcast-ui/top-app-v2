import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
export const runtime = "nodejs";

const ENRICH = "nonprofit_directory_enrichment";
const TRUSTED = "trusted_resources";
const SPONSORS = "sponsors_catalog";

/**
 * GET — snapshot of content quality distribution (admin only).
 * Query: ?table=nonprofit|trusted|sponsor|all (default all)
 */
export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const table = String(url.searchParams.get("table") || "all").toLowerCase();

  const out = { ok: true, nonprofit: null, trusted: null, sponsors: null };

  async function nonprofitSnapshot() {
    const { data: rows, error } = await ctx.admin.from(ENRICH).select("ein, content_quality_score, enrichment_qa_flags, enrichment_promotion_ready, naming_review_required, research_status").limit(2000);
    if (error) return { error: error.message };
    const list = rows || [];
    let weak = list.filter((r) => (r.content_quality_score ?? 0) < 0.5).length;
    let ready = list.filter((r) => r.enrichment_promotion_ready === true).length;
    const rescore = list.filter((r) => r.content_quality_score == null).length;
    return {
      total: list.length,
      promotion_ready: ready,
      weak_under_0_5: weak,
      missing_score: rescore,
      sample_weakest: list
        .filter((r) => r.content_quality_score != null)
        .sort((a, b) => (a.content_quality_score ?? 0) - (b.content_quality_score ?? 0))
        .slice(0, 12)
        .map((r) => ({ ein: r.ein, score: r.content_quality_score, flags: r.enrichment_qa_flags })),
    };
  }

  if (table === "all" || table === "nonprofit") {
    out.nonprofit = await nonprofitSnapshot();
  }
  if (table === "all" || table === "trusted") {
    const { data: rows, error } = await ctx.admin.from(TRUSTED).select("id, display_name, content_quality_score").limit(500);
    out.trusted = error
      ? { error: error.message }
      : {
          total: (rows || []).length,
          missing_score: (rows || []).filter((r) => r.content_quality_score == null).length,
        };
  }
  if (table === "all" || table === "sponsor") {
    const { data: rows, error } = await ctx.admin.from(SPONSORS).select("slug, name, content_quality_score").limit(500);
    out.sponsors = error
      ? { error: error.message }
      : {
          total: (rows || []).length,
          missing_score: (rows || []).filter((r) => r.content_quality_score == null).length,
        };
  }

  return Response.json(out);
}
