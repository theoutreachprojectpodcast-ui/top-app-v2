#!/usr/bin/env node
/**
 * CLI: print deterministic logo candidate URLs for a sponsor website (no auto-upload).
 * Mirrors logic in src/lib/sponsors/logoDiscoveryServer.js
 * Usage: node scripts/sponsor-logo-probe.mjs https://example.com
 */
const websiteUrl = process.argv[2];
if (!websiteUrl) {
  console.error("Usage: node scripts/sponsor-logo-probe.mjs <https://company-site>");
  process.exit(1);
}

function safeOrigin(input) {
  try {
    const u = new URL(String(input || "").trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

function buildSponsorLogoCandidates(url) {
  const origin = safeOrigin(url);
  if (!origin) return [];
  const out = [
    { url: `${origin}/favicon.ico`, source: "site_favicon", confidence: "medium" },
    { url: `${origin}/apple-touch-icon.png`, source: "apple_touch_icon", confidence: "medium" },
  ];
  try {
    const u = new URL(String(url).trim());
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

console.log(JSON.stringify({ websiteUrl, candidates: buildSponsorLogoCandidates(websiteUrl) }, null, 2));
