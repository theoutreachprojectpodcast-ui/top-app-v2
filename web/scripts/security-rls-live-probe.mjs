/**
 * Live PostgREST RLS exposure probe (production / QA).
 * Fails if sensitive tables leak to the publishable/anon key or lack RLS.
 *
 * Usage:
 *   node scripts/security-rls-live-probe.mjs
 *   (loads .env.vercel.production / .env.local; strips escaped \\r\\n)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(rel) {
  const envPath = path.join(webRoot, rel);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    val = val
      .replace(/\\r\\n/g, "")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .replace(/[\r\n]+/g, "")
      .trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function env(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

loadEnvFile(".env.vercel.production");
loadEnvFile(".env.local");

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const service = env("SUPABASE_SERVICE_ROLE_KEY");
const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

if (!url || !service || !anon) {
  if (process.env.SECURITY_CHECK_REQUIRE_LIVE === "1") {
    console.error("[security-rls-live-probe] Missing Supabase URL / service role / anon key");
    process.exit(1);
  }
  console.log("[security-rls-live-probe] SKIP — credentials not configured");
  process.exit(0);
}

/** Must never return rows to anon (private / PII / ops). */
const MUST_BLOCK_SELECT = [
  "top_profiles",
  "top_qa_profiles",
  "top_app_saved_org_eins",
  "top_oauth_mobile_handoffs",
  "admin_audit_logs",
  "admin_settings",
  "admin_media_assets",
  "billing_records",
  "billing_remediation_log",
  "sponsor_applications",
  "trusted_resource_applications",
  "form_submissions",
  "podcast_sponsor_checkout_events",
  "support_to_pro_migration_records",
  "support_to_pro_migration_emails",
  "community_post_comments",
  "community_post_reactions",
  "profiles",
  "favorites",
  "messages",
  "threads",
  "curated_orgs",
  "nonprofit_websites_stage",
  "stg_us_vet_connect",
];

/** Tables that must reject anon writes via RLS (not merely constraints). */
const MUST_RLS_BLOCK_WRITE = [
  ...MUST_BLOCK_SELECT,
  "nonprofit_websites",
  "nonprofit_audience_tags",
  "nonprofit_profiles",
  "nonprofit_overrides",
  "ntee_categories",
  "veteran_org_seed",
  "irs_veterans_orgs",
  "nonprofit_audience_flags",
  "sponsors_catalog",
  "trusted_resources",
  "community_posts",
  "nonprofits",
];

const admin = createClient(url, service, { auth: { persistSession: false } });
const pub = createClient(url, anon, { auth: { persistSession: false } });

const failures = [];
const warnings = [];

console.log("[security-rls-live-probe] project", (url.match(/https:\/\/([^.]+)/) || [])[1] || "?");

for (const fn of ["_top_rls_security_audit"]) {
  const { data, error } = await admin.rpc(fn);
  if (error) {
    failures.push(`Audit RPC ${fn} missing — apply supabase_security_advisor_rls_2026_07.sql (${error.code || error.message})`);
    break;
  }
  const fails = (data || []).filter((r) => String(r.status).toUpperCase() === "FAIL");
  for (const row of fails) {
    failures.push(`Audit FAIL ${row.object_type} ${row.object_name}: ${row.detail}`);
  }
  console.log(`Audit ${fn}: FAIL=${fails.length} total=${(data || []).length}`);
}

async function classifyInsert(table) {
  const ins = await pub.from(table).insert({}).select();
  if (!ins.error) {
    // Accidental success — remove probe rows immediately via service role.
    const rows = Array.isArray(ins.data) ? ins.data : ins.data ? [ins.data] : [];
    for (const row of rows) {
      if (row?.id != null) {
        await admin.from(table).delete().eq("id", row.id);
      }
    }
    return "INSERT_OK";
  }
  if (/row-level security|42501/i.test(`${ins.error.code} ${ins.error.message}`)) return "RLS_BLOCK";
  if (/PGRST205|Could not find/i.test(ins.error.message || "")) return "MISSING";
  if (/null value|not-null|check constraint|invalid input|duplicate|foreign key|PGRST204/i.test(ins.error.message || "")) {
    return "REACHED";
  }
  return `OTHER:${ins.error.code || "x"}`;
}

for (const table of MUST_BLOCK_SELECT) {
  const { count, error } = await pub.from(table).select("*", { count: "exact", head: true });
  if (error && /PGRST205|Could not find/i.test(error.message || "")) continue;
  if (!error && (count || 0) > 0) {
    failures.push(`LEAK ${table}: anon SELECT count=${count}`);
  }
}

for (const table of MUST_RLS_BLOCK_WRITE) {
  const cls = await classifyInsert(table);
  if (cls === "MISSING") continue;
  if (cls === "INSERT_OK" || cls === "REACHED") {
    failures.push(`NO_RLS ${table}: anon write class=${cls}`);
  }
}

// OpenAPI discovery via service role — flag any heap table anon can write
const openApiRes = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
    Accept: "application/openapi+json",
  },
});
const spec = await openApiRes.json();
const tables = Object.keys(spec.paths || {})
  .filter((p) => p.startsWith("/") && !p.includes("{") && p.length > 1)
  .map((p) => p.slice(1))
  .filter((t) => !t.startsWith("rpc/") && !t.includes("/"));

for (const table of tables) {
  if (MUST_RLS_BLOCK_WRITE.includes(table)) continue;
  const cls = await classifyInsert(table);
  if (cls === "INSERT_OK" || cls === "REACHED") {
    // Views/MVs often surface as REACHED/OTHER — treat INSERT_OK as critical always
    if (cls === "INSERT_OK") {
      failures.push(`NO_RLS ${table}: anon INSERT succeeded`);
    } else if (!table.startsWith("vw_") && !table.includes("_search_") && !table.endsWith("_v") && !table.endsWith("_mv")) {
      warnings.push(`Suspect ${table}: anon write class=${cls}`);
    }
  }
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings.slice(0, 40)) console.log(" ", w);
}

if (failures.length) {
  console.error("\n[security-rls-live-probe] FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("[security-rls-live-probe] OK — no anon leaks / missing RLS on probed tables");
