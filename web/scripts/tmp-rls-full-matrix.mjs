/**
 * Full OpenAPI (service role) + RLS matrix for every exposed public table.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function load(rel) {
  for (const l of fs.readFileSync(rel, "utf8").split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    let k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    v = v
      .replace(/\\r\\n/g, "")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .replace(/[\r\n]+/g, "")
      .trim();
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

load("web/.env.vercel.production");
const url = clean("NEXT_PUBLIC_SUPABASE_URL");
const service = clean("SUPABASE_SERVICE_ROLE_KEY");
const anon = clean("NEXT_PUBLIC_SUPABASE_ANON_KEY") || clean("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

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
  .filter((t) => !t.includes("/"))
  .sort();

console.log(`tables=${tables.length}`);

const admin = createClient(url, service, { auth: { persistSession: false } });
const anonClient = createClient(url, anon, { auth: { persistSession: false } });

const intentionalPublicRead = new Set([
  // filled after review — start empty and classify
]);

const rows = [];
for (const table of tables) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  if (svc.error) {
    rows.push({ table, status: "svc_error", detail: svc.error.message?.slice(0, 80) });
    continue;
  }
  const pub = await anonClient.from(table).select("*", { count: "exact", head: true });
  const ins = await anonClient.from(table).insert({}).select();
  let insertClass = "unknown";
  if (!ins.error) insertClass = "INSERT_OK";
  else if (/row-level security|42501/i.test(`${ins.error.code} ${ins.error.message}`)) insertClass = "RLS_BLOCK";
  else if (/null value|not-null|check constraint|invalid input|duplicate|foreign key|PGRST204/i.test(ins.error.message || "")) {
    insertClass = "REACHED";
  } else insertClass = `OTHER:${ins.error.code || ""}`;

  const pubN = pub.error ? -1 : (pub.count ?? 0);
  const svcN = svc.count ?? 0;
  rows.push({
    table,
    svcN,
    pubN,
    insertClass,
    pubErr: pub.error?.code || "",
  });
}

const critical = rows.filter((r) => r.insertClass === "INSERT_OK" || r.insertClass === "REACHED");
const leaks = rows.filter((r) => r.pubN > 0);
const blocked = rows.filter((r) => r.svcN > 0 && r.pubN === 0 && r.insertClass === "RLS_BLOCK");

console.log("\n=== CRITICAL: anon can reach table for write (no RLS or permissive) ===");
for (const r of critical) {
  console.log(`  ${r.table} svc=${r.svcN} anon=${r.pubN} insert=${r.insertClass}`);
}

console.log("\n=== Anon SELECT count > 0 ===");
for (const r of leaks) {
  console.log(`  ${r.table} svc=${r.svcN} anon=${r.pubN} insert=${r.insertClass}`);
}

console.log("\n=== Fully blocked (svc>0, anon=0, RLS) ===", blocked.length);
console.log("\n=== Full matrix ===");
for (const r of rows) {
  console.log(
    String(r.table).padEnd(42),
    `svc=${String(r.svcN ?? "-").padStart(4)}`,
    `anon=${String(r.pubN ?? "-").padStart(4)}`,
    r.insertClass,
  );
}

fs.writeFileSync(
  "web/scripts/tmp-rls-matrix2-out.json",
  JSON.stringify({ project: "xbtfoundwmhrqrbcuqcw", generatedAt: new Date().toISOString(), rows }, null, 2),
);
console.log("\nWrote web/scripts/tmp-rls-matrix2-out.json");
