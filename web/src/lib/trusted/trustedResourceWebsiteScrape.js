/**
 * Lightweight public-metadata scrape from an organization's website (no JS rendering).
 * Results are stored on `trusted_resources` so detail pages do not re-fetch every load.
 */

import { validateOutboundFetchUrl } from "@/lib/security/ssrfGuard";

function readMetaContent(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return "";
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text.replace(/^\/+/, "")}`;
}

/**
 * @param {string} websiteUrl
 * @returns {Promise<{
 *   long_description?: string,
 *   mission?: string,
 *   logo_url?: string,
 *   detail_field_sources: Record<string, string>,
 *   detail_scraped_at: string,
 * } | null>}
 */
export async function scrapeTrustedResourceWebsite(websiteUrl) {
  const url = normalizeUrl(websiteUrl);
  if (!url) return null;

  const safe = validateOutboundFetchUrl(url);
  if (!safe.ok) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(safe.url.href, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "TheOutreachProject-TrustedResourceScraper/1.0",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const description = firstNonEmpty(
      readMetaContent(html, "og:description"),
      readMetaContent(html, "description"),
    );
    const title = readMetaContent(html, "og:title");
    const image = readMetaContent(html, "og:image");

    const detail_field_sources = {};
    const patch = { detail_scraped_at: new Date().toISOString() };

    if (description) {
      patch.long_description = description.slice(0, 4000);
      detail_field_sources.long_description = "scraped";
    }
    if (title && !description) {
      patch.mission = title.slice(0, 500);
      detail_field_sources.mission = "scraped";
    } else if (description && description.length <= 280) {
      patch.mission = description;
      detail_field_sources.mission = "scraped";
    }
    if (image && /^https?:\/\//i.test(image)) {
      patch.logo_url = image;
      detail_field_sources.logo_url = "scraped";
    }

    patch.detail_field_sources = detail_field_sources;
    if (!Object.keys(detail_field_sources).length) return null;
    return patch;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}
