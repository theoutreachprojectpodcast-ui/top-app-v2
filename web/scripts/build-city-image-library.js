#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const { resolveCityImage, saveLocalCityLibrary, toCitySlug } = require("./lib/nonprofit-enrichment/cityImageLibrary");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SOURCE_TABLE = process.env.NONPROFIT_SOURCE_TABLE || "nonprofits_search_app_v1";
const CITY_TABLE = process.env.CITY_IMAGE_TABLE || "city_images";
const BATCH_SIZE = Number(process.env.ENRICH_BATCH_SIZE || 50);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars.");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase.from(SOURCE_TABLE).select("city,state").limit(20000);
  if (error) throw error;

  const uniquePairs = [...new Set((data || []).map((r) => `${String(r.city || "").trim()}|${String(r.state || "").trim().toUpperCase()}`))]
    .map((key) => {
      const [city, state] = key.split("|");
      return { city, state };
    })
    .filter((x) => x.city && x.state);

  const library = {};
  let processed = 0;
  let resolved = 0;
  let missing = 0;

  for (const pair of uniquePairs) {
    processed += 1;
    const slug = toCitySlug(pair.city, pair.state);
    const hit = await resolveCityImage(pair.city, pair.state);
    library[slug] = {
      city: pair.city,
      state: pair.state,
      slug,
      image_url: hit.imageUrl || "",
      source: hit.source || "none",
      last_checked_at: new Date().toISOString(),
    };
    if (hit.imageUrl) resolved += 1;
    else missing += 1;
    if (processed % BATCH_SIZE === 0) await sleep(250);
  }

  const rows = Object.values(library);
  const upsert = await supabase.from(CITY_TABLE).upsert(rows, { onConflict: "slug" });
  if (upsert.error) {
    const output = saveLocalCityLibrary(rows);
    console.log(JSON.stringify({ stored: "local-json", output, processed, resolved, missing }, null, 2));
    return;
  }

  console.log(JSON.stringify({ stored: CITY_TABLE, processed, resolved, missing }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
