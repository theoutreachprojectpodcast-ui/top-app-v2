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

for (const id of [41, 42]) {
  const del = await admin.from("curated_orgs").delete().eq("id", id);
  console.log("curated delete", id, del.error?.message || "ok");
}

// stg_us_vet_connect — delete null-name probe rows from today
const delStg = await admin.from("stg_us_vet_connect").delete().is("name", null);
console.log("stg null-name delete", delStg.error?.message || "ok");

console.log("curated", (await admin.from("curated_orgs").select("*", { count: "exact", head: true })).count);
console.log("stg", (await admin.from("stg_us_vet_connect").select("*", { count: "exact", head: true })).count);
console.log("favorites", (await admin.from("favorites").select("*", { count: "exact", head: true })).count);
console.log("messages", (await admin.from("messages").select("*", { count: "exact", head: true })).count);
console.log("threads", (await admin.from("threads").select("*", { count: "exact", head: true })).count);
