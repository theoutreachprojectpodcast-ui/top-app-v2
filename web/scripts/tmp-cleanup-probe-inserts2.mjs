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
const admin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// curated_orgs — delete only rows created during today's probe windows with null identity fields
const { data: curated } = await admin
  .from("curated_orgs")
  .select("*")
  .gte("created_at", "2026-07-16T15:50:00Z")
  .limit(20);
console.log(
  "curated candidates",
  (curated || []).map((r) => ({ id: r.id, keys: Object.keys(r), sample: JSON.stringify(r).slice(0, 180) })),
);

for (const row of curated || []) {
  const vals = Object.entries(row).filter(([k]) => !["id", "created_at", "updated_at"].includes(k));
  const allNull = vals.every(([, v]) => v == null || v === "");
  if (allNull && row.id) {
    const del = await admin.from("curated_orgs").delete().eq("id", row.id);
    console.log("deleted curated junk", row.id, del.error?.message || "ok");
  }
}

const { data: stg } = await admin.from("stg_us_vet_connect").select("*").limit(10);
console.log("stg sample", JSON.stringify(stg)?.slice(0, 400));
if (Array.isArray(stg) && stg.length <= 5) {
  const { count } = await admin.from("stg_us_vet_connect").select("*", { count: "exact", head: true });
  if ((count || 0) <= 5) {
    // try delete all if only probe junk
    const del = await admin.from("stg_us_vet_connect").delete().gte("created_at", "1970-01-01");
    console.log("stg delete", del.error?.message || "ok", "was", count);
  }
}

const after = await admin.from("curated_orgs").select("*", { count: "exact", head: true });
console.log("curated_orgs after", after.count);
