/**
 * Deterministic, review-first logo candidates from a public website URL (server-side).
 * Does not fetch third-party image bytes — returns URLs for human/admin confirmation only.
 */

function safeOrigin(input) {
  try {
    const u = new URL(String(input || "").trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    return u.origin;
  } catch {
    return null;
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
    { url: `${origin}/favicon.ico`, source: "site_favicon", confidence: "medium" },
    { url: `${origin}/apple-touch-icon.png`, source: "apple_touch_icon", confidence: "medium" },
  ];

  try {
    const u = new URL(String(websiteUrl).trim());
    const host = u.hostname.replace(/^www\./, "");
    out.push({
      url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
      source: "favicon_service",
      confidence: "low",
    });
  } catch {
    /* ignore */
  }

  return out;
}
