const { isValidImageUrl } = require("./mediaValidation");
const { normalizeWebsite } = require("./websiteDiscovery");

function toAbsolute(base, value) {
  try {
    if (!value) return "";
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function extractCandidatesFromHtml(website, html) {
  const out = [];
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch?.[1]) out.push(toAbsolute(website, ogMatch[1]));

  const iconMatches = html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/gi);
  for (const m of iconMatches) out.push(toAbsolute(website, m[1]));

  const logoImgMatches = html.matchAll(/<img[^>]+(?:class|id|src)=["'][^"']*logo[^"']*["'][^>]*>/gi);
  for (const tag of logoImgMatches) {
    const src = String(tag[0].match(/src=["']([^"']+)["']/i)?.[1] || "");
    if (src) out.push(toAbsolute(website, src));
  }

  out.push(toAbsolute(website, "/favicon.ico"));
  return [...new Set(out.filter(Boolean))];
}

async function extractLogoFromWebsite(website) {
  const normalized = normalizeWebsite(website);
  if (!normalized) return { logoUrl: "", source: "none" };
  try {
    const res = await fetch(normalized, { method: "GET", redirect: "follow" });
    if (!res.ok) return { logoUrl: "", source: "none" };
    const html = await res.text();
    const candidates = extractCandidatesFromHtml(normalized, html);
    for (const candidate of candidates) {
      const valid = await isValidImageUrl(candidate);
      if (valid) {
        const source = candidate.endsWith("/favicon.ico") ? "favicon" : "website-logo";
        return { logoUrl: candidate, source };
      }
    }
  } catch {
    return { logoUrl: "", source: "none" };
  }
  return { logoUrl: "", source: "none" };
}

module.exports = {
  extractLogoFromWebsite,
};
