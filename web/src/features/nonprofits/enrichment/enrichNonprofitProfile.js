import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import { researchOfficialWebsite } from "@/features/nonprofits/enrichment/researchOfficialWebsite";
import { verifyEnrichmentAgainstRecord } from "@/features/nonprofits/verification/verifyEnrichment";
import { fetchPublicSearchCandidates } from "@/features/nonprofits/enrichment/publicSearchResearch";
import { verifyPublicSearchCandidate } from "@/features/nonprofits/verification/verifyPublicSearchCandidate";
import { resolveCanonicalNonprofitName } from "@/features/nonprofits/naming/resolveCanonicalNonprofitName";

function officialHostname(website) {
  try {
    const u = new URL(String(website).trim().startsWith("http") ? website : `https://${website}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Full nonprofit research pipeline: official multi-page site → verify → optional verified public search gap-fill → Supabase-ready row.
 * @param {{ ein?: string, canonicalName: string, recordWebsite?: string, state?: string, irsName?: string, legalName?: string, approvedName?: string, verifiedName?: string }} record
 */
export async function enrichNonprofitProfile(record) {
  const ein9 = normalizeEinDigits(record.ein);
  const canonicalName = String(record.canonicalName || "").trim() || (ein9 ? `EIN ${ein9}` : "Organization");
  const recordWebsite = String(record.recordWebsite || "").trim();
  const state = String(record.state || "").trim();
  const irsName = String(record.irsName || "").trim();
  const legalName = String(record.legalName || "").trim();
  const approvedName = String(record.approvedName || "").trim();
  const verifiedName = String(record.verifiedName || "").trim();

  const research = await researchOfficialWebsite({ recordWebsite });
  if (!research.ok) {
    const isNoWebsite = research.error === "no_website";
    return {
      ok: true,
      verified: false,
      reason: research.error,
      enrichmentRow: null,
      verification: null,
      fetch: isNoWebsite ? undefined : research.fetch,
      researchMeta: {
        research_status: isNoWebsite ? "no_website" : "fetch_failed",
        research_confidence: null,
        source_summary: isNoWebsite
          ? "No website URL on file."
          : `Website fetch failed (${research.error}).`,
        pagesFetched: research.pagesFetched || 0,
        web_search_supplemented: false,
      },
    };
  }

  const verification = verifyEnrichmentAgainstRecord(
    {
      canonicalName,
      recordWebsite,
      fetchFinalUrl: research.fetchFinalUrl,
    },
    research.extracted
  );

  const host = officialHostname(recordWebsite);
  let webSearchSupplemented = false;
  let shortDescription = verification.ok ? verification.verified.short_description || "" : "";
  let namingGoogleCandidates = [];

  if (verification.ok) {
    const q = [`"${canonicalName}"`, state, "nonprofit"].filter(Boolean).join(" ");
    const search = await fetchPublicSearchCandidates({ query: q, limit: 8 });
    if (search.ok && search.candidates.length) {
      for (const c of search.candidates) {
        if (verifyPublicSearchCandidate({ canonicalName, officialHostname: host }, c)) {
          if (namingGoogleCandidates.length < 4) {
            namingGoogleCandidates.push({
              name: c.title,
              source: "google:title",
            });
          }
          if (String(shortDescription).trim().length >= 90) continue;
          const snip = c.snippet.trim().replace(/\s+/g, " ").slice(0, 320);
          shortDescription = shortDescription.trim()
            ? `${shortDescription.trim()} ${snip}`.trim().slice(0, 480)
            : snip;
          webSearchSupplemented = true;
        }
      }
    }
  }

  if (!verification.ok) {
    return {
      ok: true,
      verified: false,
      enrichmentRow: null,
      verification,
      researchMeta: {
        research_status: "verification_failed",
        research_confidence: verification.confidence,
        source_summary: `Researched ${research.pagesFetched} page(s) on the official site; content did not pass verification (${verification.notes?.slice(0, 4).join(", ") || "rules"}).`,
        pagesFetched: research.pagesFetched,
        web_search_supplemented: false,
      },
    };
  }

  const v = verification.verified;
  const socials = v.socials || {};
  const now = new Date().toISOString();
  const siteTitle = (research.extracted?.ogTitle || research.extracted?.pageTitle || "").trim().slice(0, 240);
  const naming = resolveCanonicalNonprofitName({
    canonicalDisplayName: canonicalName,
    irsName,
    legalName,
    approvedName,
    verifiedName,
    extractedWebsite: research.extracted,
    googleCandidates: namingGoogleCandidates,
  });

  const enrichmentRow = {
    ein: ein9 || null,
    canonical_display_name: naming.canonicalDisplayName || null,
    website_verified_name: naming.websiteVerifiedName || null,
    irs_name: irsName || null,
    legal_name: legalName || null,
    naming_confidence: naming.confidence ?? null,
    naming_source_summary: naming.namingSourceSummary || null,
    naming_status: naming.namingStatus || null,
    naming_last_checked_at: now,
    naming_review_required: !!naming.namingReviewRequired,
    naming_verified_at: naming.namingStatus === "verified" ? now : null,
    display_name_on_site: siteTitle || null,
    website_url: v.website_url || null,
    headline: v.headline,
    tagline: v.tagline,
    short_description: shortDescription || v.short_description || null,
    long_description: v.long_description,
    mission_statement: v.mission_statement,
    logo_url: v.logo_url,
    hero_image_url: v.hero_image_url || null,
    thumbnail_url: v.thumbnail_url || v.hero_image_url || null,
    facebook_url: socials.facebook?.verified ? socials.facebook.url : null,
    facebook_verified: !!socials.facebook?.verified,
    instagram_url: socials.instagram?.verified ? socials.instagram.url : null,
    instagram_verified: !!socials.instagram?.verified,
    linkedin_url: socials.linkedin?.verified ? socials.linkedin.url : null,
    linkedin_verified: !!socials.linkedin?.verified,
    x_url: socials.x?.verified ? socials.x.url : null,
    x_verified: !!socials.x?.verified,
    youtube_url: socials.youtube?.verified ? socials.youtube.url : null,
    youtube_verified: !!socials.youtube?.verified,
    tiktok_url: socials.tiktok?.verified ? socials.tiktok.url : null,
    tiktok_verified: !!socials.tiktok?.verified,
    metadata_source: webSearchSupplemented ? "website_enrichment_v1+web_search" : "website_enrichment_v1",
    web_search_supplemented: webSearchSupplemented,
    research_status: "complete",
    research_confidence: verification.confidence,
    source_summary: webSearchSupplemented
      ? `Official website (${research.pagesFetched} pages) plus a verified public-search snippet.`
      : `Official website (${research.pagesFetched} page(s)); rule-verified extraction.`,
    ein_identity_verified: true,
    identity_verified_at: now,
    profile_enriched_at: now,
    last_verified_at: now,
  };

  return {
    ok: true,
    verified: true,
    enrichmentRow,
    verification,
    researchMeta: {
      research_status: "complete",
      research_confidence: verification.confidence,
      source_summary: enrichmentRow.source_summary,
      pagesFetched: research.pagesFetched,
      web_search_supplemented: webSearchSupplemented,
    },
  };
}
