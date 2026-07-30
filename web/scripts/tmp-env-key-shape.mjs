import fs from "node:fs";

const lines = fs.readFileSync("web/.env.vercel.production", "utf8").split(/\r?\n/);
const interesting = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

for (const l of lines) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  const k = t.slice(0, i);
  if (!interesting.has(k)) continue;
  let v = t.slice(i + 1);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  v = v.replace(/\r/g, "").trim();
  console.log(
    k,
    `len=${v.length}`,
    `prefix=${v.slice(0, 12)}`,
    `suffix=${v.slice(-6)}`,
    `quoted=${t.includes('"') || t.includes("'")}`,
  );
}
