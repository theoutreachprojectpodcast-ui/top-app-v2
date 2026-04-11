/**
 * Backfill Trusted Resources display names in Supabase catalog (`trusted_resources`).
 *
 * Strategy:
 * 1) If EIN matches curated registry, use registry displayName verbatim.
 * 2) Otherwise use runtime formatter safety-net for malformed names.
 *
 * Usage:
 *   DRY RUN (default):
 *     node scripts/repair-trusted-resource-display-names.mjs
 *   APPLY:
 *     APPLY=1 node scripts/repair-trusted-resource-display-names.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryUrl = pathToFileURL(
  path.join(__dirname, "../src/features/trusted-resources/trustedResourcesRegistry.js")
).href;
const namesUrl = pathToFileURL(path.join(__dirname, "../src/lib/entityDisplayName.js")).href;

const { TRUSTED_RESOURCE_CANONICAL_RECORDS } = await import(registryUrl);
const { sanitizeOrganizationNameForDisplay } = await import(namesUrl);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APPLY = process.env.APPLY === "1";

if (!SUPABASE_URL || !(SERVICE_KEY || ANON_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key (service or anon).");
  process.exit(1);
}

function normEin(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 9) d = d.slice(-9);
  return d.padStart(9, "0");
}

const registryByEin = new Map();
for (const rec of TRUSTED_RESOURCE_CANONICAL_RECORDS) {
  for (const e of rec.eins || []) {
    const n = normEin(e);
    if (n) registryByEin.set(n, rec.displayName);
  }
}

const key = SERVICE_KEY || ANON_KEY;
const sb = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });

let sourceTable = "trusted_resources";
let rows = [];
let idField = "id";
let displayField = "display_name";
const catalog = await sb.from("trusted_resources").select("id,ein,display_name,website_url").limit(5000);
if (!catalog.error) {
  rows = catalog.data || [];
} else if (String(catalog.error.code || "") === "PGRST205") {
  const fallback = await sb
    .from("nonprofit_profiles")
    .select("*")
    .limit(5000);
  if (fallback.error) {
    console.error("Failed loading trusted fallback rows:", fallback.error.message);
    process.exit(1);
  }
  sourceTable = "nonprofit_profiles";
  idField = "ein";
  displayField = "display_name_override";
  rows = (fallback.data || [])
    .filter((r) => {
      const approved = String(r.trusted_resource_status || "").toLowerCase() === "approved";
      return r.is_trusted === true || r.is_trusted_resource === true || approved;
    })
    .map((r) => ({
      ein: r.ein,
        display_name_override: String(
          r.display_name_override || r.organization_name || r.org_name || r.legal_name || r.name || r.title || ""
        ).trim(),
      website: r.website,
    }));
} else {
  console.error("Failed loading trusted catalog rows:", catalog.error.message);
  process.exit(1);
}

const updates = [];
for (const row of rows) {
  const ein = normEin(row.ein);
  const current = sourceTable === "trusted_resources"
    ? String(row.display_name || "").trim()
    : String(row.display_name_override || "").trim();
  const registryName = registryByEin.get(ein) || "";
  const normalized = sanitizeOrganizationNameForDisplay(current, { trustCanonical: false });
  const next = registryName || normalized;
  if (!next) continue;
  if (next !== current) {
    updates.push({
      id: sourceTable === "trusted_resources" ? row.id : row.ein,
      display_name: next,
    });
  }
}

console.log(`Source table: ${sourceTable}`);
console.log(`Rows scanned: ${rows.length}`);
console.log(`Rows needing display_name repair: ${updates.length}`);
if (!updates.length) process.exit(0);

if (!APPLY) {
  console.log("Dry run only. Re-run with APPLY=1 to persist updates.");
  for (const u of updates.slice(0, 25)) {
    console.log(` - ${u.id}: ${u.display_name}`);
  }
  process.exit(0);
}

if (!SERVICE_KEY) {
  console.warn("APPLY requested but SUPABASE_SERVICE_ROLE_KEY is not set. No rows updated.");
  process.exit(0);
}

let ok = 0;
for (const patch of updates) {
  const { error: upErr } = await sb
    .from(sourceTable)
    .update({ [displayField]: patch.display_name })
    .eq(idField, patch.id);
  if (upErr) {
    console.error(`Update failed for ${patch.id}: ${upErr.message}`);
    continue;
  }
  ok += 1;
}
console.log(`Updated rows: ${ok}/${updates.length}`);
