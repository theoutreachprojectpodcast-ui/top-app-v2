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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    v = v.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
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
load("web/.env.vercel.production");
const url = env("NEXT_PUBLIC_SUPABASE_URL");
const service = env("SUPABASE_SERVICE_ROLE_KEY");
const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
const admin = createClient(url, service, { auth: { persistSession: false } });
const pub = createClient(url, anon, { auth: { persistSession: false } });

for (const table of ["nonprofits", "trusted_resources", "trusted_resources_v", "trusted_resources_mv", "nonprofits_search_app_v1"]) {
  for (const client of [
    ["svc", admin],
    ["anon", pub],
  ]) {
    const [name, c] = client;
    const r = await c.from(table).select("*", { count: "exact", head: true });
    console.log(
      table.padEnd(28),
      name,
      r.error ? `ERR code=${r.error.code} msg=${String(r.error.message).slice(0, 120)}` : `ok count=${r.count}`,
    );
  }
}

// Sample one row with service role
for (const table of ["nonprofits", "trusted_resources"]) {
  const r = await admin.from(table).select("*").limit(1);
  console.log(
    "\nsample",
    table,
    r.error ? r.error : JSON.stringify(r.data?.[0] || null)?.slice(0, 200),
  );
}

// Directory/search style views
for (const table of [
  "nonprofits_directory",
  "nonprofits_with_websites",
  "nonprofits_search_all_v2",
  "vw_veterans_geo",
]) {
  const r = await admin.from(table).select("*", { count: "exact", head: true });
  console.log(
    "view",
    table.padEnd(28),
    r.error ? `ERR ${r.error.code} ${String(r.error.message).slice(0, 100)}` : `ok ${r.count}`,
  );
}

// Hit production APIs that use these tables
for (const path of [
  "/api/directory/search?q=veteran&limit=3",
  "/api/sponsors/catalog",
  "/api/sponsors/homepage-featured",
  "/api/trusted/catalog",
  "/api/community/posts",
]) {
  const res = await fetch(`https://theoutreachproject.app${path}`, {
    headers: { accept: "application/json" },
    redirect: "manual",
  });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 120).replace(/\n/g, " "));
}
