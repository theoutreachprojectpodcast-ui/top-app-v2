function cleanText(v = "") {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function looksLikeJunkTitle(v = "") {
  const t = cleanText(v).toLowerCase();
  if (!t) return true;
  if (t === "home" || t === "about" || t === "contact") return true;
  if (t.length < 3) return true;
  return false;
}

function looksLikeAcronymish(v = "") {
  const t = cleanText(v);
  if (!t) return false;
  if (t.includes(" ")) return false;
  if (t.length > 8) return false;
  return /^[A-Z0-9]+$/.test(t);
}

function splitTitleParts(v = "") {
  return cleanText(v)
    .split(/\s*[|\-–—:•]\s*/g)
    .map((x) => cleanText(x))
    .filter(Boolean);
}

function parseJsonLdName(raw = "") {
  const txt = String(raw || "").trim();
  if (!txt) return [];
  const out = [];
  try {
    const parsed = JSON.parse(txt);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of arr) {
      if (!node || typeof node !== "object") continue;
      const type = String(node["@type"] || "").toLowerCase();
      if (
        type.includes("organization") ||
        type.includes("nonprofit") ||
        type.includes("corporation")
      ) {
        const n = cleanText(node.name || node.legalName || node.alternateName || "");
        if (n) out.push(n);
      } else {
        const n = cleanText(node.name || "");
        if (n && n.length >= 4) out.push(n);
      }
    }
  } catch {
    return [];
  }
  return out;
}

export function extractWebsiteOrganizationNameSignals(extracted = {}) {
  const candidates = [];
  const push = (name, source, weight) => {
    const n = cleanText(name);
    if (!n || looksLikeJunkTitle(n)) return;
    const w = looksLikeAcronymish(n) ? Math.max(0.35, weight - 0.38) : weight;
    candidates.push({ name: n, source, weight: w });
  };

  push(extracted.h1, "website:h1", 0.9);
  push(extracted.ogTitle, "website:og_title", 0.85);
  push(extracted.pageTitle, "website:title", 0.75);

  for (const p of splitTitleParts(extracted.ogTitle)) push(p, "website:og_title_part", 0.8);
  for (const p of splitTitleParts(extracted.pageTitle)) push(p, "website:title_part", 0.72);

  for (const n of parseJsonLdName(extracted.jsonLdOrganizationRaw || "")) {
    push(n, "website:jsonld", 0.95);
  }

  const dedup = new Map();
  for (const c of candidates) {
    const key = c.name.toLowerCase();
    const prev = dedup.get(key);
    if (!prev || c.weight > prev.weight) dedup.set(key, c);
  }
  return [...dedup.values()].sort((a, b) => b.weight - a.weight);
}

