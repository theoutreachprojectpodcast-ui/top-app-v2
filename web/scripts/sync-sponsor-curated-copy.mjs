/**
 * Sync FEATURED_SPONSORS curated copy into sponsors_catalog + sponsor_enrichment.
 *
 * Usage:
 *   node scripts/sync-sponsor-curated-copy.mjs
 *   node scripts/sync-sponsor-curated-copy.mjs --slug apex-global-outdoors
 *   cmd /c "vercel env run -e production -- node scripts/sync-sponsor-curated-copy.mjs"
 */
import { createClient } from "@supabase/supabase-js";
import { FEATURED_SPONSORS } from "../src/features/sponsors/data/featuredSponsors.js";

function env(name) {
  return String(process.env[name] || "").replace(/[\r\n]+/g, "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const slugArgIdx = process.argv.indexOf("--slug");
const slugFilter = slugArgIdx >= 0 ? String(process.argv[slugArgIdx + 1] || "").trim() : "";

if (!url || !serviceKey) {
  console.error("[sync:sponsor-curated-copy] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const items = FEATURED_SPONSORS.filter((item) => {
  const slug = String(item.id || "").trim();
  return slug && (!slugFilter || slug === slugFilter);
});

if (!items.length) {
  console.error("[sync:sponsor-curated-copy] No sponsors matched.");
  process.exit(1);
}

let ok = 0;
let failed = 0;

for (const item of items) {
  const slug = String(item.id || "").trim();
  const tagline = String(item.subtitle || item.tagline || "").trim() || null;
  const shortDescription = String(item.tag || "").trim() || null;
  const longDescription =
    String(item.longDescription || item.description || "").trim() || null;

  const { data: row, error: updateErr } = await supabase
    .from("sponsors_catalog")
    .update({
      tagline,
      short_description: shortDescription,
      long_description: longDescription,
      enrichment_status: "curated",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select("id, slug, name, long_description")
    .maybeSingle();

  if (updateErr || !row) {
    console.error(`[sync:sponsor-curated-copy] FAIL catalog ${slug}:`, updateErr?.message || "not found");
    failed += 1;
    continue;
  }

  const enrichPayload = {
    sponsor_id: row.id,
    canonical_display_name: String(item.name || row.name || "").trim() || row.name,
    curated_tagline: tagline,
    curated_short_description: shortDescription,
    curated_long_description: longDescription,
    curated_at: new Date().toISOString(),
    curated_source: "repo-sync",
    enrichment_status: "curated",
    updated_at: new Date().toISOString(),
  };

  const { error: enrichErr } = await supabase.from("sponsor_enrichment").upsert(enrichPayload, {
    onConflict: "sponsor_id",
  });

  if (enrichErr) {
    const missingCols = /curated_/i.test(enrichErr.message || "");
    if (missingCols) {
      console.warn(
        `[sync:sponsor-curated-copy] WARN ${slug}: sponsor_enrichment curated columns missing — run web/supabase/sponsor_v20_curated_copy_enrichment.sql`,
      );
      console.log(`[sync:sponsor-curated-copy] OK catalog only ${slug}`);
      ok += 1;
      continue;
    }
    console.error(`[sync:sponsor-curated-copy] FAIL enrichment ${slug}:`, enrichErr.message);
    failed += 1;
    continue;
  }

  console.log(`[sync:sponsor-curated-copy] OK ${slug}`);
  ok += 1;
}

console.log(`[sync:sponsor-curated-copy] Done: ${ok} ok, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
