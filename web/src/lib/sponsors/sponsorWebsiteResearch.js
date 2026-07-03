/**
 * Admin-only sponsor website research — produces a draft profile blob (never auto-published).
 */

import { validateOutboundFetchUrl } from "@/lib/security/ssrfGuard";

function clean(value) {
  return String(value ?? "").trim();
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return "";
}

function extractAnchorLinks(html) {
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = regex.exec(html))) links.push(clean(m[1]));
  return links;
}

function isLikelySocial(url, hostNeedle) {
  try {
    return new URL(url).hostname.toLowerCase().includes(hostNeedle);
  } catch {
    return false;
  }
}

function suggestCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/hunt|fishing|outdoor|outfitter/.test(text)) return "Outdoor adventures";
  if (/health|clinic|wellness|testosterone|medical/.test(text)) return "Health & wellness";
  if (/coach|leadership|training|consult/.test(text)) return "Professional services";
  if (/real estate|realty|homes/.test(text)) return "Real estate";
  if (/veteran|military|va /.test(text)) return "Veteran services";
  return "";
}

function extractOfferLanguage(description) {
  const d = clean(description);
  if (!d) return "";
  const m = d.match(/\b(\d+%\s*off|promo code|discount|free consultation|limited[- ]time offer)[^.!]{0,120}/i);
  return m ? m[0].trim() : "";
}

/**
 * @param {string} websiteUrl
 * @param {{ existingName?: string }} [opts]
 */
export async function researchSponsorWebsite(websiteUrl, opts = {}) {
  const raw = clean(websiteUrl);
  if (!raw) {
    return { ok: false, error: "missing_url", message: "Enter a website URL to review." };
  }

  const safe = validateOutboundFetchUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`);
  if (!safe.ok) {
    return { ok: false, error: "unsafe_url", message: safe.message || "That URL cannot be reviewed." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);
  try {
    const res = await fetch(safe.url.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "TheOutreachProject-SponsorResearch/1.0",
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: "fetch_failed",
        message: `Could not load the site (HTTP ${res.status}). Try again or enter details manually.`,
      };
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const siteTitle = clean(titleMatch?.[1]);
    const description =
      readMeta(html, "og:description") || readMeta(html, "description") || "";
    const ogImage = readMeta(html, "og:image");
    const links = extractAnchorLinks(html);

    const instagram_url = links.find((l) => isLikelySocial(l, "instagram.com")) || "";
    const facebook_url = links.find((l) => isLikelySocial(l, "facebook.com")) || "";
    const linkedin_url = links.find((l) => isLikelySocial(l, "linkedin.com")) || "";
    const twitter_url =
      links.find((l) => isLikelySocial(l, "x.com") || isLikelySocial(l, "twitter.com")) || "";
    const youtube_url =
      links.find((l) => isLikelySocial(l, "youtube.com") || isLikelySocial(l, "youtu.be")) || "";

    const name = clean(opts.existingName) || siteTitle.split(/[|\-–—]/)[0].trim() || siteTitle;
    const shortDescription = description ? description.slice(0, 280) : siteTitle.slice(0, 200);
    const longDescription = description ? description.slice(0, 4000) : "";
    const offerHint = extractOfferLanguage(description);

    const draft = {
      generatedAt: new Date().toISOString(),
      sourceUrl: safe.url.href,
      name: name || null,
      tagline: siteTitle && siteTitle !== name ? siteTitle.slice(0, 240) : null,
      short_description: shortDescription || null,
      long_description: longDescription || null,
      website_url: safe.url.href,
      logo_url: /^https?:\/\//i.test(ogImage) ? ogImage : null,
      background_image_url: /^https?:\/\//i.test(ogImage) ? ogImage : null,
      sponsor_category: suggestCategory(siteTitle, description) || null,
      instagram_url: instagram_url || null,
      facebook_url: facebook_url || null,
      linkedin_url: linkedin_url || null,
      twitter_url: twitter_url || null,
      youtube_url: youtube_url || null,
      promo_code: null,
      offer_language: offerHint || null,
      research_status: "pending_review",
      field_sources: {
        name: name ? "scraped" : null,
        short_description: shortDescription ? "scraped" : null,
        long_description: longDescription ? "scraped" : null,
        logo_url: ogImage ? "scraped" : null,
      },
    };

    const foundCount = [
      draft.name,
      draft.short_description,
      draft.long_description,
      draft.logo_url,
      draft.instagram_url,
      draft.facebook_url,
    ].filter(Boolean).length;

    if (!foundCount) {
      return {
        ok: false,
        error: "no_content",
        message: "We could not extract usable content from that site. Add details manually.",
      };
    }

    return { ok: true, draft, warnings: foundCount < 2 ? ["Limited public metadata found on this site."] : [] };
  } catch (e) {
    const aborted = e?.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "timeout" : "fetch_error",
      message: aborted
        ? "The site took too long to respond. Try again later."
        : "Could not review that website right now.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
