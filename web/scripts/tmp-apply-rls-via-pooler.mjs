/**
 * Try applying RLS hardening SQL via postgres pooler using service role as password
 * (legacy pattern used by apply-billing-remediation-log.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  const p = path.join(webRoot, rel);
  if (!fs.existsSync(p)) return;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i);
    let v = t.slice(i + 1);
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
load(".env.local");

const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
const dbPass = clean("SUPABASE_DB_PASSWORD") || clean("POSTGRES_PASSWORD") || service;

const candidates = [
  clean("DATABASE_URL"),
  clean("SUPABASE_DB_URL"),
  `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(dbPass)}@db.${ref}.supabase.co:5432/postgres`,
].filter(Boolean);

const sqlPath = path.join(webRoot, "supabase/supabase_public_rls_hardening_nondestructive_2026_06.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const { default: postgres } = await import("postgres");

let applied = false;
for (const conn of candidates) {
  const safe = conn.replace(/:[^:@/]+@/, ":***@");
  console.log("try", safe);
  const client = postgres(conn, { max: 1, connect_timeout: 8, idle_timeout: 5 });
  try {
    await client`select current_database() as db, current_user as usr`;
    console.log("CONNECTED via", safe);
    await client.unsafe(sql);
    console.log("SQL APPLIED OK");
    applied = true;
    await client.end({ timeout: 5 });
    break;
  } catch (e) {
    console.log("fail:", String(e.message || e).slice(0, 160));
    try {
      await client.end({ timeout: 2 });
    } catch {
      /* ignore */
    }
  }
}

if (!applied) {
  console.error("Could not apply SQL — need SUPABASE_ACCESS_TOKEN or DATABASE_URL / DB password");
  process.exit(1);
}

process.exit(0);
