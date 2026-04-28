/**
 * Nonprofit website enrichment + verification facade (callable from jobs, routes, or scripts).
 * Prefer enrichNonprofitProfile (or runWebsiteEnrichment alias) for the full pipeline; use verifyEnrichmentAgainstRecord when testing.
 */

export { enrichNonprofitProfile, runWebsiteEnrichment } from "@/features/nonprofits/enrichment/runWebsiteEnrichment";
export { fetchWebsiteHtml } from "@/features/nonprofits/enrichment/fetchWebsiteHtml";
export { extractFromHtml } from "@/features/nonprofits/enrichment/extractFromHtml";
export { verifyEnrichmentAgainstRecord } from "@/features/nonprofits/verification/verifyEnrichment";
