import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { organizationExistsForSave } from "../src/lib/savedOrganizations/savedOrganizationsService.js";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    v = v.replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

for (const f of [".env.vercel.production", ".env.local", ".env"]) {
  loadEnv(f);
}

const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "")
  .replace(/[\r\n]+/g, "")
  .trim();
const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "")
  .replace(/[\r\n]+/g, "")
  .trim();
if (!url || !key) {
  console.error("missing env", { url: !!url, key: !!key });
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const view = process.env.NEXT_PUBLIC_NONPROFITS_SEARCH_VIEW || "nonprofits_search_app_v1";

const { data: rows, error } = await admin
  .from(view)
  .select("ein,org_name,state")
  .eq("state", "TX")
  .limit(40);

if (error) {
  console.error("search err", error.message);
  process.exit(1);
}

let ok = 0;
const fail = [];
for (const r of rows || []) {
  const digits = String(r.ein || "").replace(/\D/g, "");
  const ein = digits.length <= 9 ? digits.padStart(9, "0") : digits.slice(-9);
  const exists = await organizationExistsForSave(admin, ein);
  if (exists) ok += 1;
  else fail.push({ ein, name: r.org_name });
}

console.log(
  JSON.stringify(
    {
      sampled: (rows || []).length,
      existsOk: ok,
      existsFailCount: fail.length,
      existsFail: fail.slice(0, 15),
    },
    null,
    2,
  ),
);
