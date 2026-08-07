/**
 * Read-only reconciliation report for saved organizations.
 *
 * Usage (from repo root):
 *   node web/scripts/audit-saved-orgs-reconciliation.mjs
 *
 * Loads web/.env.vercel.production when present. Never mutates data.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(rel) {
  const p = path.isAbsolute(rel) ? rel : path.join(webRoot, rel);
  if (!fs.existsSync(p)) return false;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    v = v.replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
  }
  return true;
}

function env(name) {
  return String(process.env[name] || "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

loadEnvFile(".env.vercel.production");
loadEnvFile(".env.local");
loadEnvFile(".env");

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const profileTable = env("NEXT_PUBLIC_PROFILE_TABLE") || "top_profiles";
const savedTable = env("NEXT_PUBLIC_SAVED_ORG_TABLE") || "top_app_saved_org_eins";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function normalizeEin(raw) {
  return String(raw || "").replace(/\D/g, "");
}

async function fetchAll(table, columns, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await admin.from(table).select(columns).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = Array.isArray(data) ? data : [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

const report = {
  generatedAt: new Date().toISOString(),
  tables: { profileTable, savedTable },
  totals: {},
  accounts: {},
  savedRows: {},
  identity: {},
  manualReview: [],
};

const profiles = await fetchAll(
  profileTable,
  "id, workos_user_id, email, membership_tier, billing_status, platform_role, created_at, metadata",
);
const saved = await fetchAll(savedTable, "user_id, ein, sort_order, created_at");

report.totals.profiles = profiles.length;
report.totals.savedRows = saved.length;

const byWorkos = new Map();
const missingWorkos = [];
const duplicateWorkos = [];
for (const p of profiles) {
  const wid = String(p.workos_user_id || "").trim();
  if (!wid) {
    missingWorkos.push(p.id);
    continue;
  }
  if (!byWorkos.has(wid)) byWorkos.set(wid, []);
  byWorkos.get(wid).push(p);
}
for (const [wid, rows] of byWorkos) {
  if (rows.length > 1) duplicateWorkos.push({ workosUserId: wid, profileIds: rows.map((r) => r.id) });
}

report.identity.missingWorkosProfileCount = missingWorkos.length;
report.identity.duplicateWorkosProfileGroups = duplicateWorkos.length;
report.identity.duplicateWorkosSamples = duplicateWorkos.slice(0, 25);

const workosSet = new Set([...byWorkos.keys()]);
const orphanSaved = [];
const invalidEin = [];
const perUser = new Map();
for (const row of saved) {
  const uid = String(row.user_id || "").trim();
  const ein = normalizeEin(row.ein);
  if (ein.length !== 9) invalidEin.push({ userId: uid, ein: row.ein });
  if (uid && !workosSet.has(uid)) orphanSaved.push({ userId: uid, ein: row.ein });
  if (!perUser.has(uid)) perUser.set(uid, 0);
  perUser.set(uid, perUser.get(uid) + 1);
}

report.savedRows.invalidEinCount = invalidEin.length;
report.savedRows.orphanUserIdCount = orphanSaved.length;
report.savedRows.orphanSamples = orphanSaved.slice(0, 40);
report.savedRows.invalidEinSamples = invalidEin.slice(0, 40);
report.savedRows.usersWithSaves = perUser.size;

let trustedKeyUsers = 0;
let trustedKeysTotal = 0;
for (const p of profiles) {
  const meta = p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata) ? p.metadata : {};
  const keys = Array.isArray(meta.favoriteEntityKeys) ? meta.favoriteEntityKeys : [];
  const trusted = keys.filter((k) => String(k || "").toLowerCase().startsWith("trusted:"));
  if (trusted.length) {
    trustedKeyUsers += 1;
    trustedKeysTotal += trusted.length;
  }
}
report.savedRows.trustedMetadataUsers = trustedKeyUsers;
report.savedRows.trustedMetadataKeys = trustedKeysTotal;

const noProButHasSaves = [];
for (const [uid, count] of perUser) {
  const rows = byWorkos.get(uid) || [];
  const p = rows[0];
  if (!p) continue;
  const tier = String(p.membership_tier || "").toLowerCase();
  const billing = String(p.billing_status || "").toLowerCase();
  const role = String(p.platform_role || "").toLowerCase();
  const staff = role === "admin" || role === "moderator";
  const looksPro =
    staff ||
    tier === "member" ||
    tier === "sponsor" ||
    ["active", "trialing", "past_due"].includes(billing);
  if (!looksPro && count > 0) {
    noProButHasSaves.push({
      workosUserId: uid,
      profileId: p.id,
      tier,
      billing,
      savedCount: count,
    });
  }
}
report.accounts.savesWithoutObviousProAccess = noProButHasSaves.length;
report.accounts.savesWithoutObviousProAccessSamples = noProButHasSaves.slice(0, 40);

if (duplicateWorkos.length) {
  report.manualReview.push("Duplicate workos_user_id profile groups — merge carefully; do not delete valid saves.");
}
if (orphanSaved.length) {
  report.manualReview.push(
    "Saved rows whose user_id has no matching top_profiles.workos_user_id — may be demo IDs or deleted accounts.",
  );
}
if (invalidEin.length) {
  report.manualReview.push("Saved rows with non-9-digit EIN values.");
}

console.log(JSON.stringify(report, null, 2));
