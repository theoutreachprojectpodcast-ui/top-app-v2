/**
 * Apply grant + migrate SQL for member_connections using available env.
 * Tries Management API first, then service-role verification.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");

const files = [
  "supabase/member_connections_2026_07.sql",
  "supabase/member_connections_grant_service_role_2026_07.sql",
  "supabase/member_connections_migrate_follows_2026_07.sql",
];

function load(rel) {
  const p = path.join(webRoot, rel);
  if (!fs.existsSync(p)) return false;
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
  return true;
}

function clean(n) {
  return String(process.env[n] || "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
}

for (const rel of [
  ".env.local",
  ".env.production.local",
  ".env.vercel.production",
  ".env.vercel.qa",
  ".env.vercel.development",
]) {
  if (load(rel)) console.log("loaded", rel);
}

const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const accessToken = clean("SUPABASE_ACCESS_TOKEN");
const databaseUrl = clean("DATABASE_URL") || clean("SUPABASE_DB_URL");
const dbPass = clean("SUPABASE_DB_PASSWORD") || clean("POSTGRES_PASSWORD");
const ref = (url.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1] || "xbtfoundwmhrqrbcuqcw";

console.log("url present:", !!url, "service present:", !!service, "accessToken:", !!accessToken, "dbUrl:", !!databaseUrl, "dbPass:", !!dbPass);
console.log("project:", ref);

async function probe() {
  if (!url || !service) return { ok: false, reason: "missing_url_or_service" };
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const mc = await admin.from("member_connections").select("id,status").limit(5);
  const cf = await admin.from("community_follows").select("follower_id,following_id").limit(50);
  return {
    member_connections: mc.error
      ? { ok: false, code: mc.error.code, message: mc.error.message }
      : { ok: true, sample: (mc.data || []).length },
    community_follows: cf.error
      ? { ok: false, code: cf.error.code, message: cf.error.message }
      : {
          ok: true,
          rows: (cf.data || []).length,
          pending: (cf.data || []).filter((r) => String(r.following_id || "").startsWith("pending:")).length,
        },
  };
}

const before = await probe();
console.log("BEFORE:", JSON.stringify(before, null, 2));

if (!apply) {
  console.log("Dry run. Re-run with --apply to execute SQL.");
  console.log("Dashboard:", `https://supabase.com/dashboard/project/${ref}/sql/new`);
  for (const f of files) console.log(" -", path.join(webRoot, f));
  process.exit(0);
}

const combined = files
  .map((f) => {
    const p = path.join(webRoot, f);
    if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
    return `-- ===== ${f} =====\n${fs.readFileSync(p, "utf8")}`;
  })
  .join("\n\n");

let applied = false;

if (accessToken) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: combined }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text.slice(0, 400));
    console.log("Applied via Management API");
    applied = true;
  } catch (e) {
    console.error("Management API failed:", e.message);
  }
}

if (!applied && (databaseUrl || dbPass)) {
  const candidates = [
    databaseUrl,
    dbPass
      ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
      : "",
    dbPass
      ? `postgresql://postgres:${encodeURIComponent(dbPass)}@db.${ref}.supabase.co:5432/postgres`
      : "",
  ].filter(Boolean);
  const { default: postgres } = await import("postgres");
  for (const conn of candidates) {
    const client = postgres(conn, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false });
    try {
      await client`select 1`;
      await client.unsafe(combined);
      await client.end({ timeout: 5 });
      console.log("Applied via postgres");
      applied = true;
      break;
    } catch (e) {
      console.log("postgres fail:", String(e.message || e).slice(0, 200));
      try {
        await client.end({ timeout: 2 });
      } catch {
        /* ignore */
      }
    }
  }
}

if (!applied) {
  console.error("Could not apply automatically. Paste these three files in the SQL editor:");
  for (const f of files) console.error(" ", path.join(webRoot, f));
  process.exit(1);
}

const after = await probe();
console.log("AFTER:", JSON.stringify(after, null, 2));

if (!after.member_connections?.ok) {
  console.error("member_connections still not readable by service role.");
  process.exit(1);
}

console.log("OK — member_connections accessible.");
process.exit(0);
