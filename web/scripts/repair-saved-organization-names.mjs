/**
 * Audit + repair report for saved org EIN → directory name resolution.
 * Does NOT auto-attach favorites to unrelated nonprofits.
 *
 * Usage (service role required):
 *   node scripts/repair-saved-organization-names.mjs
 *   node scripts/repair-saved-organization-names.mjs --apply-normalize
 *
 * --apply-normalize: rewrite dashed / non-canonical EIN strings to 9-digit form
 *                    (only when the normalized EIN is unambiguous and unused).
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply-normalize");

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[s.slice(0, i).trim()] = v;
  }
  return env;
}

function envGet(key) {
  return process.env[key] || "";
}

for (const f of [".env.vercel.production", ".env.vercel.production.pull", ".env.local"]) {
  const loaded = loadEnv(path.join(root, f));
  for (const [k, v] of Object.entries(loaded)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const url = envGet("NEXT_PUBLIC_SUPABASE_URL") || envGet("SUPABASE_URL");
const key = envGet("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const SAVED = envGet("NEXT_PUBLIC_SAVED_ORG_TABLE") || "top_app_saved_org_eins";
const DIR = "nonprofits_search_app_v1";
const ENRICH = "nonprofit_directory_enrichment";
const PROF = "nonprofit_profiles";

function digits(v) {
  return String(v ?? "").replace(/\D/g, "");
}
function normalizeEin(v) {
  const d = digits(v);
  return d.length === 9 ? d : "";
}

async function inChunks(list, size, fn) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(...(await fn(list.slice(i, i + size))));
  }
  return out;
}

const { data: saved, error: savedErr } = await sb.from(SAVED).select("user_id,ein,sort_order,created_at");
if (savedErr) {
  console.error("saved fetch failed:", savedErr.message);
  process.exit(1);
}

const rows = saved || [];
const report = {
  reviewed: rows.length,
  alreadyValid: 0,
  repairedNormalized: 0,
  unresolved: 0,
  duplicatesCollapsed: 0,
  uniqueEins: 0,
  uniqueUsers: 0,
  byReason: {
    missingDirectoryAndEnrichmentAndProfile: 0,
    resolvedViaDirectory: 0,
    resolvedViaEnrichment: 0,
    resolvedViaProfile: 0,
  },
  unresolvedSamples: [],
  normalizedSamples: [],
};

const byUser = new Map();
for (const row of rows) {
  const uid = String(row.user_id || "");
  if (!byUser.has(uid)) byUser.set(uid, []);
  byUser.get(uid).push(row);
}
report.uniqueUsers = byUser.size;

const allEins = [...new Set(rows.map((r) => normalizeEin(r.ein)).filter(Boolean))];
report.uniqueEins = allEins.length;
const variants = [...new Set(allEins.flatMap((e) => [e, `${e.slice(0, 2)}-${e.slice(2)}`]))];

const dirRows = await inChunks(variants, 150, async (chunk) => {
  const { data, error } = await sb
    .from(DIR)
    .select("ein,org_name,name,display_name,canonical_display_name")
    .in("ein", chunk);
  if (error) throw new Error(`directory: ${error.message}`);
  return data || [];
});
const enrichRows = await inChunks(allEins, 150, async (chunk) => {
  const { data, error } = await sb
    .from(ENRICH)
    .select("ein,canonical_display_name,irs_name,legal_name,display_name_on_site,ein_identity_verified")
    .in("ein", chunk);
  if (error) throw new Error(`enrichment: ${error.message}`);
  return data || [];
});
const profRows = await inChunks(variants, 150, async (chunk) => {
  const { data, error } = await sb.from(PROF).select("ein,display_name_override,organization_name,legal_name").in("ein", chunk);
  if (error) throw new Error(`profiles: ${error.message}`);
  return data || [];
});

const dirBy = new Map();
for (const r of dirRows) {
  const k = normalizeEin(r.ein);
  if (k && !dirBy.has(k)) dirBy.set(k, r);
}
const enBy = new Map();
for (const r of enrichRows) {
  const k = normalizeEin(r.ein);
  if (k) enBy.set(k, r);
}
const prBy = new Map();
for (const r of profRows) {
  const k = normalizeEin(r.ein);
  if (k && !prBy.has(k)) prBy.set(k, r);
}

function resolveName(ein) {
  const d = dirBy.get(ein);
  const e = enBy.get(ein);
  const p = prBy.get(ein);
  const name = [
    e?.canonical_display_name,
    d?.canonical_display_name,
    p?.display_name_override,
    e?.display_name_on_site,
    d?.display_name,
    d?.org_name,
    d?.name,
    p?.organization_name,
    e?.irs_name,
    e?.legal_name,
    p?.legal_name,
  ]
    .map((x) => String(x || "").trim())
    .find(Boolean);
  let via = "none";
  if (d && name) via = "directory";
  else if (e && name) via = "enrichment";
  else if (p && name) via = "profile";
  return { name: name || "", via, hasDir: !!d, hasEnrich: !!e, hasProf: !!p };
}

for (const ein of allEins) {
  const info = resolveName(ein);
  if (info.via === "directory") report.byReason.resolvedViaDirectory += 1;
  else if (info.via === "enrichment") report.byReason.resolvedViaEnrichment += 1;
  else if (info.via === "profile") report.byReason.resolvedViaProfile += 1;
  else {
    report.byReason.missingDirectoryAndEnrichmentAndProfile += 1;
    if (report.unresolvedSamples.length < 25) {
      report.unresolvedSamples.push({ ein, reason: "no_directory_enrichment_or_profile_name" });
    }
  }
}

for (const [, userRows] of byUser) {
  const seen = new Set();
  for (const row of userRows) {
    const raw = String(row.ein || "");
    const ein = normalizeEin(raw);
    if (!ein) {
      report.unresolved += 1;
      continue;
    }
    if (seen.has(ein)) {
      report.duplicatesCollapsed += 1;
      continue;
    }
    seen.add(ein);

    const info = resolveName(ein);
    if (info.name) report.alreadyValid += 1;
    else report.unresolved += 1;

    if (APPLY && raw !== ein) {
      // Only rewrite when the normalized form is free for this user.
      const conflict = userRows.some((r) => r !== row && normalizeEin(r.ein) === ein && String(r.ein) === ein);
      if (!conflict) {
        const { error } = await sb.from(SAVED).update({ ein }).eq("user_id", row.user_id).eq("ein", raw);
        if (!error) {
          report.repairedNormalized += 1;
          if (report.normalizedSamples.length < 20) {
            report.normalizedSamples.push({ from: raw, to: ein });
          }
        }
      }
    }
  }
}

console.log(JSON.stringify({ ok: true, applyNormalize: APPLY, ...report }, null, 2));
console.log(
  [
    "",
    "Notes:",
    "- Canonical key remains EIN (9 digits) on top_app_saved_org_eins — no UUID remapping.",
    "- Name display is repaired in app resolve path (directory → enrichment → profile).",
    "- Unresolved EINs are preserved for manual review; they are not loosely rematched by name.",
    APPLY ? "- Applied EIN normalization where safe." : "- Dry run only. Pass --apply-normalize to rewrite dashed EINs.",
  ].join("\n"),
);
