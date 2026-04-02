#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const { resolveNonprofitWebsite, toDomain } = require("./lib/nonprofit-enrichment/websiteDiscovery");
const { extractLogoFromWebsite } = require("./lib/nonprofit-enrichment/logoExtraction");
const { resolveCityImage, toCitySlug } = require("./lib/nonprofit-enrichment/cityImageLibrary");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const SOURCE_TABLE = process.env.NONPROFIT_SOURCE_TABLE || "nonprofits_search_app_v1";
const CITY_TABLE = process.env.CITY_IMAGE_TABLE || "city_images";
const BATCH_SIZE = Number(process.env.ENRICH_BATCH_SIZE || 50);
const FORCE = String(process.env.ENRICH_FORCE || "").toLowerCase() === "true";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getCityLibrary(supabase) {
  const { data, error } = await supabase.from(CITY_TABLE).select("city,state,slug,image_url");
  if (error) return new Map();
  const map = new Map();
  for (const row of data || []) {
    map.set(row.slug, row.image_url || "");
  }
  return map;
}

async function safeMediaUpdate(supabase, ein, payload) {
  const attempts = [
    payload,
    {
      website: payload.website,
      logo_url: payload.logo_url,
      image_source_type: payload.image_source_type,
      last_checked_at: payload.last_checked_at,
    },
    {
      website: payload.website,
      logo_url: payload.logo_url,
    },
    {
      logo_url: payload.logo_url,
    },
  ];

  for (const body of attempts) {
    const filtered = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
    const res = await supabase.from(SOURCE_TABLE).update(filtered).eq("ein", ein);
    if (!res.error) return res;
  }
  return { error: new Error("All update attempts failed") };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars.");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const cityLibrary = await getCityLibrary(supabase);

  const { data, error } = await supabase
    .from(SOURCE_TABLE)
    .select("ein,org_name,city,state,website,domain,logo_url,fallback_city_image_url")
    .limit(20000);
  if (error) throw error;

  let processed = 0;
  let logoAssigned = 0;
  let cityAssigned = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of data || []) {
    processed += 1;
    if (!FORCE && row.logo_url && row.fallback_city_image_url) {
      skipped += 1;
      continue;
    }

    const website = await resolveNonprofitWebsite(row);
    const logo = website ? await extractLogoFromWebsite(website) : { logoUrl: "", source: "none" };

    const city = String(row.city || "").trim();
    const state = String(row.state || "").trim().toUpperCase();
    const slug = toCitySlug(city, state);
    let cityImage = cityLibrary.get(slug) || "";
    if (!cityImage && city && state) {
      const resolved = await resolveCityImage(city, state);
      cityImage = resolved.imageUrl || "";
    }

    const payload = {
      website: website || row.website || "",
      domain: toDomain(website || row.website || ""),
      logo_url: logo.logoUrl || row.logo_url || "",
      logo_status: logo.logoUrl ? "resolved" : "missing",
      logo_source: logo.source || "none",
      fallback_city: city || "",
      fallback_state: state || "",
      fallback_city_image_url: cityImage || row.fallback_city_image_url || "",
      image_source_type: logo.logoUrl ? "logo" : cityImage ? "city_fallback" : "none",
      last_checked_at: new Date().toISOString(),
    };

    const update = await safeMediaUpdate(supabase, row.ein, payload);
    if (update.error) {
      failed += 1;
    } else {
      if (logo.logoUrl) logoAssigned += 1;
      else if (cityImage) cityAssigned += 1;
    }

    if (processed % BATCH_SIZE === 0) await sleep(300);
  }

  console.log(JSON.stringify({ table: SOURCE_TABLE, processed, logoAssigned, cityAssigned, skipped, failed }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
