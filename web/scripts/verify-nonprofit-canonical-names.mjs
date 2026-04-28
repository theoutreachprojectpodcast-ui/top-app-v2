/**
 * Backend nonprofit name verification + persistence pipeline.
 *
 * Reads official website content, extracts branding-name candidates, cross-checks with
 * existing directory/source naming, resolves canonical display name, and upserts to
 * nonprofit_directory_enrichment.
 *
 * Usage:
 *   node scripts/verify-nonprofit-canonical-names.mjs
 *   APPLY=1 node scripts/verify-nonprofit-canonical-names.mjs
 *   APPLY=1 MAX_SCAN=400 START_OFFSET=0 node scripts/verify-nonprofit-canonical-names.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APPLY = process.env.APPLY === "1";
const MAX_SCAN = Number(process.env.MAX_SCAN || 250);
const START_OFFSET = Number(process.env.START_OFFSET || 0);
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 6));
const GOOGLE_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and a usable Supabase key.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function clean(v = "") {
  return String(v || "").replace(/\s+/g, " ").trim();
}

function formatName(v = "") {
  const raw = clean(v)
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ");
  return raw
    .split(" ")
    .map((w) => {
      if (!w) return "";
      if (/^\d+$/.test(w)) return w;
      if (/^[A-Z0-9&]{2,4}$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

function scoreName(a = "", b = "") {
  const x = clean(a).toLowerCase();
  const y = clean(b).toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.74;
  const xt = new Set(x.split(/\s+/));
  const yt = new Set(y.split(/\s+/));
  let inter = 0;
  for (const t of xt) if (yt.has(t)) inter += 1;
  return inter / Math.max(xt.size, yt.size, 1);
}

function parseJsonLdNames(html = "") {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const txt = clean(m[1]);
    if (!txt) continue;
    try {
      const parsed = JSON.parse(txt);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const n of arr) {
        if (!n || typeof n !== "object") continue;
        const t = String(n["@type"] || "").toLowerCase();
        if (t.includes("organization") || t.includes("nonprofit")) {
          const name = clean(n.name || n.legalName || n.alternateName || "");
          if (name) out.push(name);
        }
      }
    } catch {
      // ignore malformed json-ld
    }
  }
  return out;
}

function splitTitleParts(v = "") {
  return clean(v)
    .split(/\s*[|\-–—:•]\s*/g)
    .map((x) => clean(x))
    .filter((x) => x.length >= 3);
}

async function googleNameSignals(query) {
  if (!GOOGLE_KEY || !GOOGLE_CX || !clean(query)) return [];
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", GOOGLE_KEY);
  u.searchParams.set("cx", GOOGLE_CX);
  u.searchParams.set("q", query);
  u.searchParams.set("num", "5");
  try {
    const res = await fetch(u.toString(), { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return items
      .map((i) => formatName(i?.title || ""))
      .filter(Boolean)
      .map((name) => ({ name, source: "google:title", weight: 0.6 }));
  } catch {
    return [];
  }
}

async function extractWebsiteSignals(website) {
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return { ok: false, error: `http_${res.status}` };
  const html = await res.text();
  const title = clean(html.match(/<title[^>]*>([^<]{1,400})<\/title>/i)?.[1] || "");
  const og = clean(html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']{1,400})["'][^>]*>/i)?.[1] || "");
  const h1 = clean(html.match(/<h1[^>]*>([^<]{1,240})<\/h1>/i)?.[1] || "");
  const jsonld = parseJsonLdNames(html);
  const candidates = [];
  const push = (name, source, w) => {
    const n = formatName(name);
    if (!n || n.toLowerCase() === "home") return;
    candidates.push({ name: n, source, weight: w });
  };
  if (h1) push(h1, "website:h1", 0.9);
  if (og) push(og, "website:og_title", 0.85);
  if (title) push(title, "website:title", 0.74);
  for (const p of splitTitleParts(og)) push(p, "website:og_part", 0.8);
  for (const p of splitTitleParts(title)) push(p, "website:title_part", 0.7);
  for (const j of jsonld) push(j, "website:jsonld", 0.95);
  const ded = new Map();
  for (const c of candidates) {
    const k = c.name.toLowerCase();
    const prev = ded.get(k);
    if (!prev || c.weight > prev.weight) ded.set(k, c);
  }
  return {
    ok: true,
    candidates: [...ded.values()].sort((a, b) => b.weight - a.weight),
    pageTitle: title,
    ogTitle: og,
    h1,
  };
}

function resolveCanonical(row, web, google = []) {
  const weighted = [];
  const push = (name, source, weight) => {
    const n = formatName(name);
    if (!n) return;
    weighted.push({ name: n, source, weight });
  };
  push(row.canonical_display_name, "existing_canonical", 0.83);
  push(row.display_name, "existing_display", 0.78);
  push(row.verified_name, "verified_name", 0.84);
  push(row.approved_name, "approved_name", 0.82);
  push(row.org_name || row.organization_name || row.name || row.NAME, "directory_name", 0.76);
  push(row.legal_name, "legal_name", 0.64);
  push(row.irs_name, "irs_name", 0.64);
  for (const c of web.candidates || []) push(c.name, c.source, c.weight);
  for (const g of google) {
    const legalAlign = scoreName(g.name, row.legal_name || row.org_name || "");
    const webAlign = scoreName(g.name, web.candidates?.[0]?.name || "");
    push(g.name, g.source || "google:title", 0.54 + Math.max(legalAlign, webAlign) * 0.24);
  }

  const bucket = new Map();
  for (const c of weighted) {
    const k = c.name.toLowerCase();
    const prev = bucket.get(k) || { name: c.name, score: 0, sources: [] };
    prev.score += c.weight;
    prev.sources.push(c.source);
    bucket.set(k, prev);
  }
  const ranked = [...bucket.values()].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top) {
    return { canonical: "", confidence: 0, status: "unresolved", review: true, summary: "No candidate names available." };
  }
  const second = ranked[1];
  const disagreement = second ? scoreName(top.name, second.name) < 0.45 : false;
  const confidence = Math.max(0, Math.min(1, top.score / 2.4));
  const review = confidence < 0.62 || disagreement;
  return {
    canonical: top.name,
    websiteVerified: web.candidates?.[0]?.name || "",
    confidence,
    status: review ? "needs_review" : "verified",
    review,
    summary: `Selected from ${top.sources.join(", ")}.`,
  };
}

async function loadRows() {
  const to = START_OFFSET + MAX_SCAN - 1;
  const { data, error } = await sb
    .from("nonprofits_search_app_v1")
    .select("*")
    .range(START_OFFSET, to);
  if (error) throw error;
  return data || [];
}

async function upsertNameResult(ein9, result, website) {
  const now = new Date().toISOString();
  const patch = {
    ein: ein9,
    canonical_display_name: result.canonical || null,
    website_verified_name: result.websiteVerified || null,
    naming_confidence: result.confidence ?? null,
    naming_source_summary: result.summary || null,
    naming_status: result.status || null,
    naming_last_checked_at: now,
    naming_verified_at: result.status === "verified" ? now : null,
    naming_review_required: !!result.review,
    website_url: website || null,
    updated_at: now,
  };
  return sb.from("nonprofit_directory_enrichment").upsert(patch, { onConflict: "ein" });
}

async function worker(queue, results) {
  while (queue.length) {
    const row = queue.shift();
    const ein9 = normalizeEin(String(row?.ein || ""));
    const website = clean(row?.website || row?.Website || row?.website_url || "");
    if (ein9.length !== 9 || !website) continue;
    try {
      const web = await extractWebsiteSignals(website);
      if (!web.ok) {
        results.push({ ein: ein9, ok: false, error: web.error });
        continue;
      }
      const google = await googleNameSignals(`"${row.org_name || row.name || row.NAME || ""}" nonprofit ${website}`);
      const resolved = resolveCanonical(row, web, google);
      results.push({
        ein: ein9,
        ok: true,
        canonical: resolved.canonical,
        confidence: resolved.confidence,
        status: resolved.status,
      });
      if (APPLY && resolved.canonical) {
        const { error } = await upsertNameResult(ein9, resolved, website);
        if (error) results.push({ ein: ein9, ok: false, error: error.message });
      }
    } catch (error) {
      results.push({ ein: ein9, ok: false, error: String(error?.message || error) });
    }
  }
}

function normalizeEin(v = "") {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

const rows = await loadRows();
const queue = [...rows];
const results = [];
const workers = Array.from({ length: CONCURRENCY }, () => worker(queue, results));
await Promise.all(workers);

const ok = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
const reviewed = results.filter((r) => r.ok && r.status === "needs_review").length;
console.log(
  JSON.stringify(
    {
      scanned: rows.length,
      processed: ok + fail,
      ok,
      fail,
      needsReview: reviewed,
      apply: APPLY,
    },
    null,
    2
  )
);

const sample = results.slice(0, 50);
console.table(sample);
