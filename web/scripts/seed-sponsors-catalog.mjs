import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn("Skipping seed: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(0);
}

const { FEATURED_SPONSORS } = await import("../src/features/sponsors/data/featuredSponsors.js");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const rows = FEATURED_SPONSORS.map((item, idx) => ({
  slug: String(item.id || "").trim(),
  name: String(item.name || "").trim(),
  sponsor_type: String(item.industry || "").trim() || "Mission partner",
  website_url: String(item.ctaUrl || "").trim() || null,
  logo_url: String(item.logoUrl || "").trim() || null,
  background_image_url: String(item.backgroundImageUrl || "").trim() || null,
  short_description: String(item.tag || "").trim() || null,
  long_description: String(item.tagline || "").trim() || null,
  tagline: String(item.tagline || "").trim() || null,
  instagram_url: String(item.socialLinks?.instagram || "").trim() || null,
  facebook_url: String(item.socialLinks?.facebook || "").trim() || null,
  linkedin_url: String(item.socialLinks?.linkedin || "").trim() || null,
  twitter_url: String(item.socialLinks?.twitter || "").trim() || null,
  youtube_url: String(item.socialLinks?.youtube || "").trim() || null,
  additional_links: [],
  featured: true,
  display_order: idx + 1,
  warm_variant: String(item.warmVariant || "gold").trim(),
  verified: true,
  enrichment_status: "seed",
  last_enriched_at: new Date().toISOString(),
}));

const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "slug" });
if (error) {
  if (String(error.message || "").includes("sponsors_catalog")) {
    console.warn("Skipping seed: sponsors_catalog table is missing. Apply web/supabase/sponsors_catalog.sql first.");
    process.exit(0);
  }
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
}

console.log(`Seeded sponsors: ${rows.length}`);
