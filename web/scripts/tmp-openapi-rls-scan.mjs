/**
 * Discover public tables via PostgREST OpenAPI and probe RLS.
 */
import { createClient } from "@supabase/supabase-js";

function env(n) {
  return String(process.env[n] || "").replace(/[\r\n]+/g, "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

const openApiRes = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/openapi+json",
  },
});
const spec = await openApiRes.json();
const tables = Object.keys(spec.paths || {})
  .filter((p) => p.startsWith("/") && !p.includes("{") && p.length > 1)
  .map((p) => p.slice(1));

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const sensitive = [];
const publicRead = [];
const blocked = [];

for (const table of tables.sort()) {
  const svc = await admin.from(table).select("*", { count: "exact", head: true });
  const pub = await anon.from(table).select("*", { count: "exact", head: true });
  if (svc.error) continue;
  const svcN = svc.count ?? 0;
  const pubN = pub.error ? -1 : (pub.count ?? 0);
  if (pubN > 0 && svcN > 0) {
    if (["community_posts"].includes(table)) publicRead.push({ table, svcN, pubN });
    else sensitive.push({ table, svcN, pubN });
  } else if (pubN === 0 && svcN > 0) {
    blocked.push(table);
  } else if (pubN > 0) {
    publicRead.push({ table, svcN, pubN });
  }
}

console.log("SENSITIVE LEAKS (anon reads private data):", sensitive);
console.log("PUBLIC READ (anon sees rows):", publicRead);
console.log("BLOCKED (svc has rows, anon sees 0):", blocked.length, "tables");
