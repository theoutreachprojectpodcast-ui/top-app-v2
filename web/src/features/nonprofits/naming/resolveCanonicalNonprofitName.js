import { sanitizeOrganizationNameForDisplay } from "@/lib/entityDisplayName";
import { extractWebsiteOrganizationNameSignals } from "@/features/nonprofits/naming/websiteNameExtractor";

function clean(v = "") {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function scoreName(a = "", b = "") {
  const x = clean(a).toLowerCase();
  const y = clean(b).toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.75;
  const xt = new Set(x.split(/\s+/));
  const yt = new Set(y.split(/\s+/));
  let inter = 0;
  for (const t of xt) if (yt.has(t)) inter += 1;
  const denom = Math.max(xt.size, yt.size, 1);
  return inter / denom;
}

function looksAcronymLike(v = "") {
  const t = clean(v);
  if (!t || t.includes(" ")) return false;
  if (t.length > 8) return false;
  return /^[A-Z0-9]+$/.test(t);
}

export function resolveCanonicalNonprofitName(input = {}) {
  const {
    canonicalDisplayName = "",
    irsName = "",
    legalName = "",
    approvedName = "",
    verifiedName = "",
    extractedWebsite = null,
    googleCandidates = [],
  } = input;

  const websiteSignals = extractWebsiteOrganizationNameSignals(extractedWebsite || {});
  const websiteBest = websiteSignals[0]?.name || "";
  const firstExisting = clean(canonicalDisplayName || approvedName || verifiedName || "");

  const weighted = [];
  const push = (name, source, weight) => {
    const n = sanitizeOrganizationNameForDisplay(name, { trustCanonical: false });
    if (!n) return;
    weighted.push({ name: n, source, weight });
  };

  if (firstExisting) push(firstExisting, "existing_display", 0.82);
  if (verifiedName) push(verifiedName, "verified_name", 0.84);
  if (approvedName) push(approvedName, "approved_name", 0.8);
  if (websiteBest) push(websiteBest, "website_branding", 0.92);
  if (legalName) push(legalName, "legal_name", 0.66);
  if (irsName) push(irsName, "irs_name", 0.64);
  for (const s of websiteSignals.slice(1, 5)) push(s.name, s.source, Math.max(0.6, s.weight - 0.08));
  for (const g of googleCandidates || []) {
    if (!g?.name) continue;
    const legalAlign = scoreName(g.name, legalName);
    const webAlign = scoreName(g.name, websiteBest);
    const confidenceBoost = Math.max(legalAlign, webAlign);
    push(g.name, g.source || "google", 0.58 + confidenceBoost * 0.22);
  }

  if (!weighted.length) {
    return {
      canonicalDisplayName: "",
      websiteVerifiedName: "",
      confidence: 0,
      namingStatus: "unresolved",
      namingReviewRequired: true,
      namingSourceSummary: "No viable naming source found.",
      candidates: [],
    };
  }

  const buckets = new Map();
  for (const c of weighted) {
    const key = c.name.toLowerCase();
    const prev = buckets.get(key) || { name: c.name, score: 0, sources: [] };
    prev.score += c.weight;
    if (c.name.split(/\s+/).length >= 2) prev.score += 0.06;
    if (looksAcronymLike(c.name)) prev.score -= 0.34;
    prev.sources.push(c.source);
    buckets.set(key, prev);
  }

  const all = [...buckets.values()].sort((a, b) => b.score - a.score);
  const top = all[0];
  const second = all[1];
  const disagreement = second ? scoreName(top.name, second.name) < 0.45 : false;
  const confidence = Math.max(0, Math.min(1, top.score / 2.4));
  const review = confidence < 0.62 || disagreement;
  const status = review ? "needs_review" : "verified";

  return {
    canonicalDisplayName: top.name,
    websiteVerifiedName: sanitizeOrganizationNameForDisplay(websiteBest, { trustCanonical: false }),
    confidence,
    namingStatus: status,
    namingReviewRequired: review,
    namingSourceSummary: `Selected from ${top.sources.join(", ")}; candidates=${all.length}.`,
    candidates: all,
  };
}

