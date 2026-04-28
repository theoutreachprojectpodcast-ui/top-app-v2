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
const TABLE = "sponsors_catalog";
const MAX_SCAN = Number(process.env.MAX_SCAN || 200);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn("Skipping enrichment: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function clean(value) {
  return String(value ?? "").trim();
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return clean(m[1]);
  }
  return "";
}

function extractSocialLinks(html = "") {
  const all = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) all.push(clean(m[1]));
  return {
    instagram_url: all.find((x) => x.includes("instagram.com")) || "",
    facebook_url: all.find((x) => x.includes("facebook.com")) || "",
    linkedin_url: all.find((x) => x.includes("linkedin.com")) || "",
    twitter_url: all.find((x) => x.includes("x.com") || x.includes("twitter.com")) || "",
    youtube_url: all.find((x) => x.includes("youtube.com") || x.includes("youtu.be")) || "",
  };
}

async function enrichRow(row) {
  const website = clean(row.website_url);
  if (!website) return null;
  try {
    const res = await fetch(website, { redirect: "follow", headers: { "user-agent": "TOP-Sponsors-Enrichment/1.0" } });
    if (!res.ok) return null;
    const html = await res.text();
    const title = clean((html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || "");
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const logo = extractMeta(html, "og:image");
    const social = extractSocialLinks(html);
    return {
      name: clean(row.name) || title || clean(row.slug),
      short_description: clean(row.short_description) || description,
      long_description: clean(row.long_description) || description,
      tagline: clean(row.tagline) || description,
      logo_url: clean(row.logo_url) || logo,
      ...Object.fromEntries(
        Object.entries(social).map(([k, v]) => [k, clean(row[k]) || v]),
      ),
      enrichment_status: "enriched",
      verified: true,
      last_enriched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

const { data, error } = await supabase.from(TABLE).select("*").limit(MAX_SCAN);
if (error) {
  if (String(error.message || "").includes("sponsors_catalog")) {
    console.warn("Skipping enrichment: sponsors_catalog table is missing. Apply web/supabase/sponsors_catalog.sql first.");
    process.exit(0);
  }
  console.error(error.message);
  process.exit(1);
}

let enriched = 0;
for (const row of data || []) {
  const patch = await enrichRow(row);
  if (!patch) continue;
  const { error: upErr } = await supabase.from(TABLE).update(patch).eq("id", row.id);
  if (!upErr) enriched += 1;
}

console.log(`Sponsors scanned: ${(data || []).length}`);
console.log(`Sponsors enriched: ${enriched}`);
