const { isLikelyWebsite } = require("./mediaValidation");

function normalizeWebsite(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.hostname}`.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function toDomain(website = "") {
  const normalized = normalizeWebsite(website);
  if (!normalized) return "";
  try {
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

async function discoverWebsiteFromWikidata(name, city, state) {
  const query = [name, city, state].filter(Boolean).join(" ").trim();
  if (!query) return "";
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&limit=5`;
    const searchRes = await fetch(searchUrl, { method: "GET", redirect: "follow" });
    if (!searchRes.ok) return "";
    const searchJson = await searchRes.json();
    const ids = Array.isArray(searchJson?.search) ? searchJson.search.map((x) => x.id).filter(Boolean) : [];
    for (const id of ids) {
      const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(id)}.json`;
      const entityRes = await fetch(entityUrl, { method: "GET", redirect: "follow" });
      if (!entityRes.ok) continue;
      const entityJson = await entityRes.json();
      const entity = entityJson?.entities?.[id];
      const claim = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
      const website = normalizeWebsite(claim);
      if (!website) continue;
      const usable = await isLikelyWebsite(website);
      if (usable) return website;
    }
  } catch {
    return "";
  }
  return "";
}

async function resolveNonprofitWebsite(row = {}) {
  const existing = normalizeWebsite(row.website || row.Website || row.domain || "");
  if (existing) return existing;
  const discovered = await discoverWebsiteFromWikidata(row.org_name || row.name || "", row.city || "", row.state || "");
  return normalizeWebsite(discovered);
}

module.exports = {
  discoverWebsiteFromWikidata,
  normalizeWebsite,
  resolveNonprofitWebsite,
  toDomain,
};
