/**
 * Lightweight HTML signal extraction (no DOM parser dependency).
 * Produces structured candidates for the verification layer.
 */

const META_CONTENT = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
const META_CONTENT_REV = /<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']([^"']+)["'][^>]*>/gi;
const TITLE_TAG = /<title[^>]*>([^<]{1,500})<\/title>/i;
const LINK_HREF = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
const JSON_LD_SCRIPT = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Multiple sites order og:image meta differently; collect every candidate. */
const OG_IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/gi,
  /<meta[^>]+property=["']og:image:url["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
  /<meta[^>]+property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
];

const SOCIAL_PATTERNS = [
  { platform: "facebook", test: /facebook\.com\/(people\/[^/]+\/\d+|[a-zA-Z0-9._-]+)\/?/i },
  { platform: "instagram", test: /instagram\.com\/([a-zA-Z0-9._]+)\/?/i },
  { platform: "linkedin", test: /linkedin\.com\/(company|school|in|showcase)\/([a-zA-Z0-9._-]+)\/?/i },
  { platform: "x", test: /(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?/i },
  { platform: "youtube", test: /youtube\.com\/(channel\/[a-zA-Z0-9_-]+|user\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+|@[a-zA-Z0-9._-]+)\/?/i },
  { platform: "tiktok", test: /tiktok\.com\/@([a-zA-Z0-9._-]+)\/?/i },
];

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

function extractAllOgImageUrls(html) {
  const found = new Set();
  for (const pat of OG_IMAGE_PATTERNS) {
    const re = new RegExp(pat.source, "gi");
    let m;
    while ((m = re.exec(html)) !== null) {
      const u = decodeEntities(m[1] || "").trim();
      if (/^https?:\/\//i.test(u)) found.add(u);
    }
  }
  return [...found];
}

function pickPreferredOgImage(urls) {
  const list = (urls || []).filter((u) => /^https?:\/\//i.test(String(u).trim()));
  if (!list.length) return "";
  return [...list].sort((a, b) => b.length - a.length)[0];
}

/**
 * Parse JSON-LD blocks for Organization / NGO — logo, sameAs, description.
 */
function parseJsonLdOrgSignals(html) {
  const sameAs = [];
  let logoUrl = "";
  let description = "";
  const ldRe = new RegExp(JSON_LD_SCRIPT.source, "gi");
  let lm;
  while ((lm = ldRe.exec(html)) !== null) {
    const raw = String(lm[1] || "").trim();
    if (!raw) continue;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const types = [].concat(node["@type"] || []);
      const typeStr = types.map((t) => String(t).toLowerCase()).join(" ");
      const looksLikeOrg =
        /organization|ngo|nonprofit|localbusiness|corporation|educationalorganization|governmentorganization|performinggroup|sportsorganization/.test(
          typeStr
        );
      if (!looksLikeOrg && !node.sameAs && !node.logo && !node.description) continue;

      if (node.description && String(node.description).length > description.length) {
        description = String(node.description).trim();
      }
      if (node.sameAs) {
        const sa = Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs];
        for (const u of sa) {
          if (typeof u === "string" && /^https?:\/\//i.test(u)) sameAs.push(u.trim().split("#")[0]);
        }
      }
      if (node.logo) {
        let lu = "";
        if (typeof node.logo === "string") lu = node.logo;
        else if (node.logo?.url) lu = typeof node.logo.url === "string" ? node.logo.url : node.logo.url?.url || "";
        else if (node.logo?.["@type"] === "ImageObject" && node.logo.url) lu = String(node.logo.url);
        if (lu && /^https?:\/\//i.test(lu) && lu.length > logoUrl.length) logoUrl = lu.trim();
      }
    }
  }
  return { jsonLdSameAs: [...new Set(sameAs)], jsonLdLogoUrl: logoUrl, jsonLdDescription: description };
}

function urlToSocialCandidate(url) {
  const full = String(url || "").trim().split("#")[0];
  if (!full.startsWith("http")) return null;
  for (const { platform, test } of SOCIAL_PATTERNS) {
    if (test.test(full)) return { platform, url: full };
  }
  return null;
}

function extractRelMeAndFooterSocials(html, baseUrl) {
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const out = [];
  const relMe = /<a[^>]+rel=["'][^"']*\bme\b[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = relMe.exec(html)) !== null) {
    const href = String(m[1] || "").trim();
    try {
      const abs = new URL(href, base).href.split("#")[0];
      const c = urlToSocialCandidate(abs);
      if (c) out.push(c);
    } catch {
      /* skip */
    }
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
  let m;
  const re = new RegExp(LINK_HREF.source, "gi");
  while ((m = re.exec(html)) !== null) {
    let href = String(m[1] || "").trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, base);
      const full = abs.href.split("#")[0];
      for (const { platform, test } of SOCIAL_PATTERNS) {
        if (test.test(full)) {
          if (!found.has(platform)) found.set(platform, full);
          break;
        }
      }
    } catch {
      /* skip */
    }
  }
  const fromLinks = [...found.entries()].map(([platform, url]) => ({ platform, url }));
  const fromRelMe = extractRelMeAndFooterSocials(html, baseUrl);
  const merged = new Map();
  for (const x of [...fromLinks, ...fromRelMe]) {
    if (x?.platform && x?.url && !merged.has(x.platform)) merged.set(x.platform, x.url);
  }
  return [...merged.entries()].map(([platform, url]) => ({ platform, url }));
}

function extractAppleTouchIcon(html, baseUrl) {
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    return "";
  }
  const re =
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi;
  const m = re.exec(html);
  if (!m) return "";
  const href = decodeEntities((m[1] || m[2] || "").trim());
  if (!href) return "";
  try {
    return new URL(href, base).href.split("#")[0];
  } catch {
    return "";
  }
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

  const ogImageCandidates = extractAllOgImageUrls(slice);
  const ogImage = pickPreferredOgImage(ogImageCandidates);

  const twitterRaw = decodeEntities(
    meta["twitter:image"] || meta["twitter:image:src"] || meta["twitter:image0"] || ""
  );
  const twitterImage = twitterRaw && /^https?:\/\//i.test(twitterRaw) ? twitterRaw : "";

  const h1Match = slice.match(/<h1[^>]*>([^<]{1,400})<\/h1>/i);
  const h1 = decodeEntities(h1Match?.[1] || "");

  let aboutBlob = "";
  const aboutSection = slice.match(/<main[^>]*>([\s\S]{0,12000})<\/main>/i);
  if (aboutSection) {
    aboutBlob = aboutSection[1].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
  }
  if (aboutBlob.length < 200) {
    const article = slice.match(/<article[^>]*>([\s\S]{0,10000})<\/article>/i);
    if (article) {
      aboutBlob = article[1].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
    }
  }
  const aboutClean = decodeEntities(aboutBlob.replace(/\s+/g, " ").trim()).slice(0, 4000);

  let socialCandidates = extractSocialUrls(slice, finalUrl);
  const ld = [];
  const ldRe = new RegExp(JSON_LD_SCRIPT.source, "gi");
  let lm;
  while ((lm = ldRe.exec(slice)) !== null) {
    const raw = decodeEntities(String(lm[1] || "").trim());
    if (raw) ld.push(raw);
  }

  const jsonLd = parseJsonLdOrgSignals(slice);
  for (const u of jsonLd.jsonLdSameAs) {
    const c = urlToSocialCandidate(u);
    if (c && !socialCandidates.some((s) => s.platform === c.platform)) {
      socialCandidates.push(c);
    }
  }

  const appleIcon = extractAppleTouchIcon(slice, finalUrl);

  return {
    sourceUrl: finalUrl,
    pageTitle,
    ogTitle,
    metaDescription: description,
    h1,
    aboutText: aboutClean,
    ogImage,
    ogImageCandidates,
    twitterImage,
    socialCandidates,
    jsonLdOrganizationRaw: ld.join("\n"),
    jsonLdSameAs: jsonLd.jsonLdSameAs,
    jsonLdDescription: jsonLd.jsonLdDescription,
    jsonLdLogoUrl: jsonLd.jsonLdLogoUrl,
    appleTouchIconUrl: appleIcon,
  };
}

function mergeUniqueSocials(lists) {
  const socialMap = new Map();
  for (const list of lists) {
    for (const s of list || []) {
      if (s?.platform && s?.url && !socialMap.has(s.platform)) socialMap.set(s.platform, s.url);
    }
  }
  return [...socialMap.entries()].map(([platform, url]) => ({ platform, url }));
}

function mergeJsonLdSameAs(pages) {
  const out = new Set();
  for (const p of pages) {
    for (const u of p.jsonLdSameAs || []) {
      if (u) out.add(String(u).trim().split("#")[0]);
    }
  }
  return [...out];
}

function longestText(...vals) {
  return [...vals].filter(Boolean).sort((a, b) => String(b).length - String(a).length)[0] || "";
}

function bestImageFromPages(list, key) {
  const cands = [];
  for (const p of list) {
    if (key === "og" && p.ogImageCandidates?.length) {
      cands.push(...p.ogImageCandidates);
    } else if (key === "og" && p.ogImage) {
      cands.push(p.ogImage);
    }
    if (key === "tw" && p.twitterImage) cands.push(p.twitterImage);
  }
  const uniq = [...new Set(cands.filter((u) => /^https?:\/\//i.test(String(u).trim())))];
  return pickPreferredOgImage(uniq);
}

/**
 * Merge homepage + secondary page extractions for a single verification pass.
 * @param {Array<ReturnType<typeof extractFromHtml>>} pages
 */
export function mergePageExtractions(pages) {
  const list = (pages || []).filter(Boolean);
  if (!list.length) return null;
  const [first, ...rest] = list;
  const socialLists = list.map((p) => p.socialCandidates);
  const socialCandidates = mergeUniqueSocials(socialLists);

  const bestMeta = [...list].sort((a, b) => (b.metaDescription?.length || 0) - (a.metaDescription?.length || 0))[0];
  const bestTitle = [...list].sort((a, b) => (b.ogTitle?.length || 0) - (a.ogTitle?.length || 0))[0];
  const aboutParts = list.map((p) => p.aboutText).filter(Boolean);
  const aboutText = aboutParts.join("\n\n").replace(/\s+/g, " ").trim().slice(0, 12000);

  const ogImage = bestImageFromPages(list, "og") || first.ogImage || "";
  const twitterImage = bestImageFromPages(list, "tw") || first.twitterImage || "";

  const jsonLdDescription = longestText(...list.map((p) => p.jsonLdDescription));
  const jsonLdLogoUrl = longestText(...list.map((p) => p.jsonLdLogoUrl));
  const jsonLdSameAs = mergeJsonLdSameAs(list);
  const appleTouchIconUrl = longestText(...list.map((p) => p.appleTouchIconUrl));

  return {
    sourceUrl: first.sourceUrl,
    pageTitle: first.pageTitle,
    ogTitle: bestTitle?.ogTitle || first.ogTitle,
    metaDescription: bestMeta?.metaDescription || first.metaDescription,
    h1: first.h1 || rest.find((r) => r.h1)?.h1 || "",
    aboutText,
    ogImage,
    ogImageCandidates: [...new Set(list.flatMap((p) => p.ogImageCandidates || (p.ogImage ? [p.ogImage] : [])))],
    twitterImage,
    socialCandidates,
    jsonLdOrganizationRaw: list.map((p) => p.jsonLdOrganizationRaw).filter(Boolean).join("\n"),
    jsonLdSameAs,
    jsonLdDescription,
    jsonLdLogoUrl,
    appleTouchIconUrl,
  };
}
