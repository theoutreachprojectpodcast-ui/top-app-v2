/**
 * Recompute content_quality_score / flags / promotion_ready for org tables (QA batch).
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in environment (e.g. web/.env.local).
 *
 *   pnpm --dir web exec node scripts/qa-recompute-quality.mjs
 *   pnpm --dir web exec node scripts/qa-recompute-quality.mjs --all
 *   pnpm --dir web exec node scripts/qa-recompute-quality.mjs --trusted --limit 200
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeNonprofitEnrichmentQuality,
  computeTrustedResourceQuality,
  computeSponsorCatalogQuality,
  isPromotionReady,
  isTrustedPromotionReady,
  isSponsorPromotionReady,
} from "../src/features/enrichment/computeContentQuality.js";

function loadDotEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function argvFlag(name) {
  return process.argv.includes(`--${name}`);
}

function argvNum(name, def) {
  const ix = process.argv.indexOf(`--${name}`);
  if (ix < 0 || !process.argv[ix + 1]) return def;
  const n = parseInt(process.argv[ix + 1], 10);
  return Number.isFinite(n) ? n : def;
}

/** @param {import("@supabase/supabase-js").SupabaseClient} supabase */
async function batchSelectAll(supabase, table, pageSize, onPage) {
  let from = 0;
  let pages = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data: rows, error } = await supabase.from(table).select("*").range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    const list = rows || [];
    if (list.length === 0) break;
    await onPage(list);
    pages += 1;
    from += pageSize;
    if (list.length < pageSize) break;
  }
  return pages;
}

async function run() {
  loadDotEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[qa-recompute-quality] Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const pageSize = argvNum("limit", 500);
  const runAll = argvFlag("all");
  const runNonprofit = runAll || (!argvFlag("trusted") && !argvFlag("sponsors"));
  const runTrusted = runAll || argvFlag("trusted");
  const runSponsors = runAll || argvFlag("sponsors");

  if (runNonprofit) {
    let total = 0;
    await batchSelectAll(supabase, "nonprofit_directory_enrichment", pageSize, async (rows) => {
      for (const row of rows) {
        const q = computeNonprofitEnrichmentQuality(row);
        const ready = isPromotionReady(q, { namingReviewRequired: !!row.naming_review_required });
        const { error: upErr } = await supabase
          .from("nonprofit_directory_enrichment")
          .update({
            content_quality_score: q.score,
            enrichment_qa_flags: q.flags,
            last_quality_audit_at: new Date().toISOString(),
            enrichment_promotion_ready: ready,
          })
          .eq("ein", row.ein);
        if (upErr) console.warn(row.ein, upErr.message);
        else total += 1;
      }
    });
    console.log(`[qa-recompute-quality] nonprofit_directory_enrichment rows updated: ${total}`);
  }

  if (runTrusted) {
    let total = 0;
    await batchSelectAll(supabase, "trusted_resources", pageSize, async (rows) => {
      for (const row of rows) {
        const q = computeTrustedResourceQuality(row);
        const ready = isTrustedPromotionReady(q);
        const { error: upErr } = await supabase
          .from("trusted_resources")
          .update({
            content_quality_score: q.score,
            enrichment_qa_flags: q.flags,
            last_quality_audit_at: new Date().toISOString(),
            enrichment_promotion_ready: ready,
          })
          .eq("id", row.id);
        if (upErr) console.warn(row.id, upErr.message);
        else total += 1;
      }
    });
    console.log(`[qa-recompute-quality] trusted_resources rows updated: ${total}`);
  }

  if (runSponsors) {
    let total = 0;
    await batchSelectAll(supabase, "sponsors_catalog", pageSize, async (rows) => {
      for (const row of rows) {
        const q = computeSponsorCatalogQuality(row);
        const ready = isSponsorPromotionReady(q, row);
        const { error: upErr } = await supabase
          .from("sponsors_catalog")
          .update({
            content_quality_score: q.score,
            enrichment_qa_flags: q.flags,
            last_quality_audit_at: new Date().toISOString(),
            enrichment_promotion_ready: ready,
          })
          .eq("id", row.id);
        if (upErr) console.warn(row.slug, upErr.message);
        else total += 1;
      }
    });
    console.log(`[qa-recompute-quality] sponsors_catalog rows updated: ${total}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
