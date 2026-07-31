/**
 * Reconcile / migrate community_follows → member_connections and print a report.
 *
 *   node scripts/reconcile-member-connections.mjs
 *   node scripts/reconcile-member-connections.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  migrateCommunityFollowsToMemberConnections,
  resetConnectionsBackendCache,
} from "../src/lib/community/memberConnections.js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const sqlPath = path.join(webRoot, "supabase/member_connections_migrate_follows_2026_07.sql");

function load(rel) {
  const p = path.join(webRoot, rel);
  if (!fs.existsSync(p)) return;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    v = v.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function clean(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

load(".env.vercel.production");
load(".env.production.local");
load(".env.local");
load(".env.vercel.qa");
load(".env.vercel.development");

const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !service) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

const report = {
  totalFollowsChecked: 0,
  pendingFollows: 0,
  acceptedEdges: 0,
  blockedFollows: 0,
  memberConnectionsBefore: 0,
  migrated: 0,
  memberConnectionsAfter: 0,
  byStatus: {},
  invalidOrphans: 0,
  note: "",
};

const follows = await admin.from("community_follows").select("*").limit(5000);
if (follows.error) {
  report.note = `community_follows: ${follows.error.message}`;
} else {
  const rows = follows.data || [];
  report.totalFollowsChecked = rows.length;
  for (const row of rows) {
    const following = String(row.following_id || "");
    if (following.startsWith("pending:")) report.pendingFollows += 1;
    else if (following.startsWith("blocked:")) report.blockedFollows += 1;
    else report.acceptedEdges += 1;
  }
}

const before = await admin.from("member_connections").select("id,status").limit(5000);
if (before.error) {
  const denied = /permission denied/i.test(String(before.error.message || ""));
  console.error("member_connections unreadable:", before.error.message);
  if (denied) {
    console.error("Apply grant SQL first:");
    console.error("  web/supabase/member_connections_grant_service_role_2026_07.sql");
    console.error(`  https://supabase.com/dashboard/project/${(clean("NEXT_PUBLIC_SUPABASE_URL").match(/https:\/\/([^.]+)/) || [])[1] || "xbtfoundwmhrqrbcuqcw"}/sql/new`);
  } else {
    console.error(`Apply SQL first: ${sqlPath}`);
  }
  process.exit(1);
}
report.memberConnectionsBefore = (before.data || []).length;
for (const row of before.data || []) {
  const s = String(row.status || "unknown");
  report.byStatus[s] = (report.byStatus[s] || 0) + 1;
}

if (apply) {
  resetConnectionsBackendCache();
  const result = await migrateCommunityFollowsToMemberConnections(admin);
  report.migrated = result.migrated || 0;
  report.note = result.reason || result.ok ? "migration applied via service role" : "migration failed";
} else {
  report.note = "Dry run only. Re-run with --apply to migrate via JS helper (or paste migrate SQL in Supabase).";
}

const after = await admin.from("member_connections").select("id,status").limit(5000);
report.memberConnectionsAfter = (after.data || []).length;
report.byStatus = {};
for (const row of after.data || []) {
  const s = String(row.status || "unknown");
  report.byStatus[s] = (report.byStatus[s] || 0) + 1;
}

console.log(JSON.stringify(report, null, 2));
console.log(`SQL migration file: ${sqlPath}`);
