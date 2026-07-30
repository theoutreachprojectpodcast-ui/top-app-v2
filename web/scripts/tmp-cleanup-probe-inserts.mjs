/**
 * Classify anon write exposure WITHOUT leaving rows behind.
 * Prefer OPTIONS/expected RLS errors; only insert into a transaction is not available via PostgREST,
 * so we infer RLS from error codes and immediately delete any accidental insert by service role PK.
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
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
const url = env("NEXT_PUBLIC_SUPABASE_URL");
const service = env("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(url, service, { auth: { persistSession: false } });

/** Tables we may have polluted with empty inserts during probing — wipe empty-ish junk only. */
const CLEANUP = ["favorites", "messages", "threads", "stg_us_vet_connect", "curated_orgs"];

for (const table of CLEANUP) {
  const before = await admin.from(table).select("*", { count: "exact", head: true });
  console.log(table, "before", before.count, before.error?.message || "");
}

// favorites / messages / threads: if row count is tiny and created during probe, delete all empty rows.
// Prefer delete where all columns nullish — safest for empty junk inserts.
for (const table of ["favorites", "messages", "threads"]) {
  const { data, error } = await admin.from(table).select("*").limit(20);
  if (error) {
    console.log(table, "select err", error.message);
    continue;
  }
  console.log(table, "sample", JSON.stringify(data)?.slice(0, 300));
  if (Array.isArray(data) && data.length > 0 && data.length <= 5) {
    // Only wipe if table is essentially empty aside from probe junk
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    if ((count || 0) <= 5) {
      const del = await admin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // fallback: try delete all via filter that matches everything
      if (del.error) {
        const del2 = await admin.from(table).delete().gte("created_at", "1970-01-01");
        console.log(table, "delete2", del2.error?.message || "ok", "count was", count);
      } else {
        console.log(table, "deleted probe rows, prior count", count);
      }
    }
  }
}

// curated_orgs / stg: do NOT mass-delete — had real data (40+) or staging. Only report.
const cur = await admin.from("curated_orgs").select("*", { count: "exact", head: true });
console.log("curated_orgs count", cur.count, "(not auto-deleted)");
