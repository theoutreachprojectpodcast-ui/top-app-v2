/**
 * Apply member_connections_workflow_2026_07.sql (timestamps + friends visibility).
 *   node scripts/apply-member-connections-workflow.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(webRoot, "supabase/member_connections_workflow_2026_07.sql");
const apply = process.argv.includes("--apply");
const PROJECT_REF = "xbtfoundwmhrqrbcuqcw";

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
    v = v.replace(/[\r\n]+/g, "").trim();
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

for (const f of [
  ".env.local",
  ".env.production.local",
  ".env.vercel.production",
  ".env.vercel.production.pulled",
  ".env.vercel.production.fresh",
]) {
  load(f);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const accessToken = clean("SUPABASE_ACCESS_TOKEN");
const databaseUrl = clean("DATABASE_URL") || clean("SUPABASE_DB_URL");
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1] || clean("SUPABASE_PROJECT_REF") || PROJECT_REF;
const dbPass = clean("SUPABASE_DB_PASSWORD") || clean("POSTGRES_PASSWORD");

console.log("SQL:", sqlPath);
console.log("Project ref:", ref);

async function verify() {
  if (!url || !service) return null;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const probe = await admin
    .from("member_connections")
    .select("id,accepted_at,declined_at,cancelled_at,removed_at")
    .limit(1);
  return {
    ok: !probe.error,
    error: probe.error ? `${probe.error.code}: ${probe.error.message}` : null,
    sampleKeys: probe.data?.[0] ? Object.keys(probe.data[0]) : [],
  };
}

if (!apply) {
  console.log("VERIFY:", await verify());
  console.log("Dry run only. Re-run with --apply to execute.");
  process.exit(0);
}

let applied = false;
if (accessToken) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    const bodyText = await res.text();
    if (!res.ok) throw new Error(bodyText.slice(0, 400));
    console.log("SQL APPLIED via Management API");
    applied = true;
  } catch (e) {
    console.error("Management API failed:", e.message || e);
  }
}

if (!applied && (databaseUrl || dbPass)) {
  const candidates = [
    databaseUrl,
    dbPass && ref
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
      : "",
    dbPass && ref
      ? `postgresql://postgres:${encodeURIComponent(dbPass)}@db.${ref}.supabase.co:5432/postgres`
      : "",
  ].filter(Boolean);
  const { default: postgres } = await import("postgres");
  for (const conn of candidates) {
    const client = postgres(conn, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false });
    try {
      await client.unsafe(sql);
      await client.end({ timeout: 5 });
      console.log("SQL APPLIED via postgres");
      applied = true;
      break;
    } catch (e) {
      console.log("pg fail:", String(e.message || e).slice(0, 220));
      try {
        await client.end({ timeout: 2 });
      } catch {
        /* ignore */
      }
    }
  }
}

const v = await verify();
console.log("VERIFY:", v);
if (!applied) {
  console.error("Could not apply automatically. Paste SQL in:");
  console.error(`https://supabase.com/dashboard/project/${ref}/sql/new`);
  process.exit(1);
}
