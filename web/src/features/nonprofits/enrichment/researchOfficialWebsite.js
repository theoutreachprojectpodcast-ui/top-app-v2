import { fetchWebsiteHtml } from "@/features/nonprofits/enrichment/fetchWebsiteHtml";
import { extractFromHtml, mergePageExtractions } from "@/features/nonprofits/enrichment/extractFromHtml";
import { discoverInternalContentUrls } from "@/features/nonprofits/enrichment/discoverInternalContentUrls";
import { normalizeContentText } from "@/features/nonprofits/enrichment/normalizeContentText";

/**
 * Multi-page research: homepage + up to three same-origin about/mission paths.
 */
export async function researchOfficialWebsite({ recordWebsite }) {
  const website = String(recordWebsite || "").trim();
  if (!website) {
    return { ok: false, error: "no_website", pagesFetched: 0 };
  }

  const home = await fetchWebsiteHtml(website);
  if (!home.ok || !home.html) {
    return { ok: false, error: home.error || "fetch_failed", fetch: home, pagesFetched: 0 };
  }

  const homeEx = extractFromHtml(home.html, home.finalUrl);
  const extraUrls = discoverInternalContentUrls(home.html, home.finalUrl, 5);
  const secondary = [];
  for (const url of extraUrls) {
    const r = await fetchWebsiteHtml(url, { maxBytes: 950_000, timeoutMs: 14_000 });
    if (r.ok && r.html) secondary.push(extractFromHtml(r.html, r.finalUrl));
  }

  let merged = mergePageExtractions([homeEx, ...secondary]);
  if (merged?.aboutText) {
    merged = { ...merged, aboutText: normalizeContentText(merged.aboutText) };
  }

  return {
    ok: true,
    extracted: merged,
    fetchFinalUrl: home.finalUrl,
    pagesFetched: 1 + secondary.length,
  };
}
