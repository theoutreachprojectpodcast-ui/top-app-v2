/**
 * Find same-origin URLs on homepage that likely carry mission/about content.
 */
const PATH_HINT =
  /\/(about|about-us|our-story|mission|who-we-are|what-we-do|overview|our-mission|programs|team|board|leadership|our-work|impact|vision|values|contact|connect|community|media|press|news)(\/|$|\?)/i;

export function discoverInternalContentUrls(html, finalUrl, maxN = 3) {
  let base;
  try {
    base = new URL(finalUrl);
  } catch {
    return [];
  }
  const canonicalHost = base.hostname.replace(/^www\./i, "").toLowerCase();
  const seen = new Set([base.href.split("#")[0]]);
  const out = [];

  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null && out.length < maxN) {
    const href = String(m[1] || "").trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    try {
      const abs = new URL(href, base);
      if (!/^https?:$/i.test(abs.protocol)) continue;
      const h = abs.hostname.replace(/^www\./i, "").toLowerCase();
      if (h !== canonicalHost) continue;
      if (!PATH_HINT.test(abs.pathname)) continue;
      const key = abs.href.split("#")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    } catch {
      /* skip */
    }
  }
  return out;
}
