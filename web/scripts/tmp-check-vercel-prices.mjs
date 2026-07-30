import fs from "node:fs";

function load(p) {
  if (!fs.existsSync(p)) return {};
  const o = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    o[s.slice(0, i).trim()] = v;
  }
  return o;
}

function classify(v) {
  if (!v) return "(missing)";
  if (v.startsWith("price_")) return `price_… OK (${v.length} chars)`;
  if (v.startsWith("prod_")) return `prod_… WRONG — need price_ ID (${v.length} chars)`;
  if (v.startsWith("mk_")) return `mk_… WRONG (${v.length} chars)`;
  if (/^\$|^\d+(\.\d+)?$/.test(v)) return `$ amount WRONG (${v})`;
  return `${v.slice(0, 12)}… (${v.length} chars)`;
}

const keys = [
  "STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY",
  "STRIPE_PRICE_PODCAST_SPONSOR_IMPACT",
  "STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL",
  "STRIPE_PRICE_FOUNDATIONAL_SPONSOR",
  "STRIPE_PRICE_SUPPORT_MONTHLY",
  "STRIPE_PRICE_MEMBER_MONTHLY",
];

for (const label of ["production", "preview"]) {
  const file = `.env.vercel.${label}`;
  const env = load(file);
  console.log(`\n=== ${label} ===`);
  for (const k of keys) {
    console.log(`${k}: ${classify(env[k] || "")}`);
  }
}
