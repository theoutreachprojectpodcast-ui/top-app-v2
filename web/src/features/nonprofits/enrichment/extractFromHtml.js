/**
 * Lightweight HTML signal extraction (no DOM parser dependency).
 * Produces structured candidates for the verification layer.
 */

const META_CONTENT = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
const META_CONTENT_REV = /<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']([^"']+)["'][^>]*>/gi;
const TITLE_TAG = /<title[^>]*>([^<]{1,500})<\/title>/i;
const LINK_HREF = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
const OG_IMAGE = /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i;
const JSON_LD_SCRIPT = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function collectMeta(html) {
  const out = {};
  let m;
  const re = new RegExp(META_CONTENT.source, "gi");
  while ((m = re.exec(html)) !== null) {
    const key = String(m[1] || "").toLowerCase().trim();
    out[key] = decodeEntities(m[2]);
  }
  const re2 = new RegExp(META_CONTENT_REV.source, "gi");
  while ((m = re2.exec(html)) !== null) {
    const key = String(m[2] || "").toLowerCase().trim();
    out[key] = decodeEntities(m[1]);
  }
  return out;
}

function extractSocialUrls(html, baseUrl) {
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const found = new Map();
  const patterns = [
    { platform: "facebook", test: /facebook\.com\/(people\/[^/]+\/\d+|[a-zA-Z0-9._-]+)\/?/i },
    { platform: "instagram", test: /instagram\.com\/([a-zA-Z0-9._]+)\/?/i },
    { platform: "linkedin", test: /linkedin\.com\/(company|school|in)\/([a-zA-Z0-9._-]+)\/?/i },
    { platform: "x", test: /(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?/i },
    { platform: "youtube", test: /youtube\.com\/(channel\/[a-zA-Z0-9_-]+|user\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+|@[a-zA-Z0-9._-]+)\/?/i },
    { platform: "tiktok", test: /tiktok\.com\/@([a-zA-Z0-9._-]+)\/?/i },
  ];

  let m;
  const re = new RegExp(LINK_HREF.source, "gi");
  while ((m = re.exec(html)) !== null) {
    let href = String(m[1] || "").trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, base);
      const host = abs.hostname.replace(/^www\./i, "").toLowerCase();
      const full = abs.href.split("#")[0];
      for (const { platform, test } of patterns) {
        if (test.test(full)) {
          if (!found.has(platform)) found.set(platform, full);
          break;
        }
      }
    } catch {
      /* skip */
    }
  }
  return [...found.entries()].map(([platform, url]) => ({ platform, url }));
}

/**
 * @param {string} html
 * @param {string} finalUrl
 */
export function extractFromHtml(html, finalUrl) {
  const slice = html.length > 800_000 ? html.slice(0, 800_000) : html;
  const meta = collectMeta(slice);
  const titleMatch = slice.match(TITLE_TAG);
  const pageTitle = decodeEntities(titleMatch?.[1] || "");
  const ogTitle = meta["og:title"] || meta["twitter:title"] || "";
  const description =
    meta["og:description"] || meta["description"] || meta["twitter:description"] || "";
  const ogImageMatch = slice.match(OG_IMAGE);
  const ogImage = ogImageMatch ? decodeEntities(ogImageMatch[1]) : "";
  const twitterImage = decodeEntities(meta["twitter:image"] || meta["twitter:image:src"] || "");

  const h1Match = slice.match(/<h1[^>]*>([^<]{1,400})<\/h1>/i);
  const h1 = decodeEntities(h1Match?.[1] || "");

  let aboutBlob = "";
  const aboutSection = slice.match(/<main[^>]*>([\s\S]{0,12000})<\/main>/i);
  if (aboutSection) {
    aboutBlob = aboutSection[1].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
  }
  const aboutClean = decodeEntities(aboutBlob.replace(/\s+/g, " ").trim()).slice(0, 4000);

  const socialCandidates = extractSocialUrls(slice, finalUrl);
  const ld = [];
  let lm;
  const ldRe = new RegExp(JSON_LD_SCRIPT.source, "gi");
  while ((lm = ldRe.exec(slice)) !== null) {
    const raw = decodeEntities(String(lm[1] || "").trim());
    if (raw) ld.push(raw);
  }

  return {
    sourceUrl: finalUrl,
    pageTitle,
    ogTitle,
    metaDescription: description,
    h1,
    aboutText: aboutClean,
    ogImage,
    twitterImage,
    socialCandidates,
    jsonLdOrganizationRaw: ld.join("\n"),
  };
}

/**
 * Merge homepage + secondary page extractions for a single verification pass.
 * @param {Array<ReturnType<typeof extractFromHtml>>} pages
 */
export function mergePageExtractions(pages) {
  const list = (pages || []).filter(Boolean);
  if (!list.length) return null;
  const [first, ...rest] = list;
  const socialMap = new Map();
  for (const p of list) {
    for (const s of p.socialCandidates || []) {
      if (s?.platform && s?.url && !socialMap.has(s.platform)) socialMap.set(s.platform, s.url);
    }
  }
  const bestMeta = [...list].sort((a, b) => (b.metaDescription?.length || 0) - (a.metaDescription?.length || 0))[0];
  const bestTitle = [...list].sort((a, b) => (b.ogTitle?.length || 0) - (a.ogTitle?.length || 0))[0];
  const aboutParts = list.map((p) => p.aboutText).filter(Boolean);
  const aboutText = aboutParts.join("\n\n").replace(/\s+/g, " ").trim().slice(0, 12000);
  return {
    sourceUrl: first.sourceUrl,
    pageTitle: first.pageTitle,
    ogTitle: bestTitle?.ogTitle || first.ogTitle,
    metaDescription: bestMeta?.metaDescription || first.metaDescription,
    h1: first.h1 || rest.find((r) => r.h1)?.h1 || "",
    aboutText,
    ogImage: first.ogImage || rest.find((r) => r.ogImage)?.ogImage || "",
    twitterImage: first.twitterImage || rest.find((r) => r.twitterImage)?.twitterImage || "",
    socialCandidates: [...socialMap.entries()].map(([platform, url]) => ({ platform, url })),
    jsonLdOrganizationRaw: list.map((p) => p.jsonLdOrganizationRaw).filter(Boolean).join("\n"),
  };
}
