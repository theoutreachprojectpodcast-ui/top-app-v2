#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const { resolveNonprofitWebsite, toDomain } = require("./lib/nonprofit-enrichment/websiteDiscovery");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const TABLE = process.env.NONPROFIT_SOURCE_TABLE || "nonprofits_search_app_v1";
const BATCH_SIZE = Number(process.env.ENRICH_BATCH_SIZE || 50);
const FORCE = String(process.env.ENRICH_FORCE || "").toLowerCase() === "true";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeWebsiteUpdate(supabase, ein, payload) {
  const full = await supabase.from(TABLE).update(payload).eq("ein", ein);
  if (!full.error) return full;
  const fallback = await supabase.from(TABLE).update({ website: payload.website }).eq("ein", ein);
  return fallback;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars.");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase.from(TABLE).select("ein,org_name,city,state,website,domain").limit(10000);
  if (error) throw error;

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of data || []) {
    processed += 1;
    const hasWebsite = !!String(row.website || "").trim();
    if (hasWebsite && !FORCE) {
      skipped += 1;
      continue;
    }
    const website = await resolveNonprofitWebsite(row);
    if (!website) {
      failed += 1;
      continue;
    }
    const payload = { website, domain: toDomain(website), last_checked_at: new Date().toISOString() };
    const res = await safeWebsiteUpdate(supabase, row.ein, payload);
    if (res.error) failed += 1;
    else updated += 1;
    if (processed % BATCH_SIZE === 0) await sleep(250);
  }

  console.log(JSON.stringify({ table: TABLE, processed, updated, skipped, failed }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
