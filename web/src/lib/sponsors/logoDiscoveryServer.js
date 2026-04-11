/**
 * Deterministic logo discovery from a sponsor website (server-side).
 * `buildSponsorLogoCandidates` — URL guesses without fetching (admin preview).
 * `buildOrderedSponsorLogoCandidates` — ordered targets after HTML fetch (enrichment pipeline).
 */

import { extractFromHtml } from "@/features/nonprofits/enrichment/extractFromHtml";

function safeOrigin(input) {
  try {
    const u = new URL(String(input || "").trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

function absUrl(href, base) {
  try {
    return new URL(String(href || "").trim(), String(base || "").trim()).href;
  } catch {
    return "";
  }
}

/**
 * @param {string} websiteUrl
 * @returns {{ url: string, source: string, confidence: "high" | "medium" | "low" }[]}
 */
export function buildSponsorLogoCandidates(websiteUrl) {
  const origin = safeOrigin(websiteUrl);
  if (!origin) return [];

  const out = [
    { url: `${origin}/apple-touch-icon.png`, source: "apple_touch_icon", confidence: "medium" },
    { url: `${origin}/favicon.ico`, source: "site_favicon", confidence: "medium" },
  ];

  return out;
}

function parseLinkTags(html) {
  const links = [];
  const re = /<link\s+([^>]+)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const block = m[1];
    const relM = block.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const hrefM = block.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    const sizesM = block.match(/\bsizes\s*=\s*["']([^"']+)["']/i);
    if (!relM || !hrefM) continue;
    links.push({
      rel: String(relM[1] || "").toLowerCase(),
      href: String(hrefM[1] || "").trim(),
      sizes: String(sizesM?.[1] || "").toLowerCase(),
    });
  }
  return links;
}

function linkLogoScore(rel, sizes) {
  if (!rel) return 0;
  if (rel.includes("mask-icon")) return -1;
  if (rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed")) return 100;
  if (rel.includes("icon") || rel.includes("shortcut")) {
    if (/\b(192|180|152|144|128)\b/.test(sizes)) return 92;
    return 74;
  }
  return 0;
}

function pathSuggestsLogo(u) {
  const p = (() => {
    try {
      return new URL(u).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();
  // Do not treat generic image extensions as logo hints — most OG images are heroes.
  return /\/(logo|logos|brand|branding|mark|marks|symbol|favicon|apple-touch)/i.test(p) || /[-_/]logo[-_/./]/i.test(p);
}

function isSvgUrl(u) {
  return /\.svg(\?|$)/i.test(String(u || ""));
}

/**
 * After fetching homepage HTML, produce ordered logo download targets (highest score first).
 *
 * @param {string} html
 * @param {string} pageUrl final URL after redirects
 * @returns {{ url: string, sourceType: string, score: number }[]}
 */
export function buildOrderedSponsorLogoCandidates(html, pageUrl) {
  const base = String(pageUrl || "").trim();
  if (!html || !base) return [];

  const extracted = extractFromHtml(html, base);
  const links = parseLinkTags(html.length > 900_000 ? html.slice(0, 900_000) : html);

  /** @type {{ url: string, sourceType: string, score: number }[]} */
  const raw = [];

  for (const L of links) {
    const score = linkLogoScore(L.rel, L.sizes);
    if (score < 0) continue;
    const url = absUrl(L.href, base);
    if (!url || !/^https?:\/\//i.test(url) || isSvgUrl(url)) continue;
    let sourceType = "site_icon";
    if (L.rel.includes("apple-touch")) sourceType = "apple_touch_icon";
    else if (L.rel.includes("shortcut")) sourceType = "shortcut_icon";
    raw.push({ url, sourceType, score });
  }

  const og = String(extracted?.ogImage || "").trim();
  if (og && /^https?:\/\//i.test(og) && !isSvgUrl(og)) {
    const url = absUrl(og, base);
    if (pathSuggestsLogo(url)) {
      raw.push({ url, sourceType: "og_image_logo_hint", score: 62 });
    }
  }

  const origin = safeOrigin(base);
  if (origin) {
    raw.push({ url: `${origin}/favicon.ico`, sourceType: "site_favicon", score: 52 });
  }

  raw.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const k = item.url.split("#")[0];
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
