/**
 * Conservative merge when re-enriching: do not clobber curated/review-pending fields
 * or clearly stronger prior confidence without stronger new evidence.
 */

function num(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

/**
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} incoming - from enrichNonprofitProfile
 * @param {{ verificationConfidence?: number, verified?: boolean }} meta
 * @returns {Record<string, unknown>}
 */
export function mergeNonprofitEnrichmentWithGuards(existing, incoming, meta = {}) {
  if (!existing || typeof existing !== "object") return { ...incoming };
  const out = { ...incoming };
  const verified = !!meta.verified;
  const newConf = num(incoming.research_confidence, 0);
  const oldConf = num(existing.research_confidence, 0);

  if (existing.naming_review_required === true) {
    for (const k of [
      "canonical_display_name",
      "website_verified_name",
      "display_name_on_site",
      "naming_status",
      "naming_confidence",
      "naming_source_summary",
    ]) {
      if (existing[k] != null && existing[k] !== "") delete out[k];
    }
  }

  if (verified && newConf + 0.02 < oldConf && existing.profile_enriched_at) {
    out.short_description = existing.short_description ?? out.short_description;
    out.long_description = existing.long_description ?? out.long_description;
    out.headline = existing.headline ?? out.headline;
    out.tagline = existing.tagline ?? out.tagline;
    out.research_confidence = oldConf;
    out.source_summary = existing.source_summary ?? out.source_summary;
  }

  if (String(existing.logo_url || "").trim() && String(incoming.logo_url || "").trim()) {
    const oldV = existing.facebook_verified || existing.instagram_verified;
    const newWeak = newConf < 0.45;
    if (oldV && newWeak) {
      out.logo_url = existing.logo_url;
    }
  }

  return out;
}
