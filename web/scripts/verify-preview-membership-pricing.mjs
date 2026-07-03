/**
 * Verify preview/QA Stripe Support price and sync Vercel preview env if needed.
 * Usage: node scripts/verify-preview-membership-pricing.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const SUPPORT_CENTS = 99;
const PRO_CENTS = 599;

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i <= 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v.replace(/\r/g, "").trim();
  }
  return env;
}

async function stripeGet(key, pathname) {
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function stripePost(key, pathname, params) {
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

const env = loadEnv(path.join(webRoot, ".env.vercel.preview"));
const key = env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("[verify:preview-pricing] Missing STRIPE_SECRET_KEY in .env.vercel.preview — run: vercel env pull .env.vercel.preview --environment=preview");
  process.exit(1);
}

const supportId =
  env.STRIPE_PRICE_SUPPORT_YEARLY ||
  env.STRIPE_PRICE_SUPPORT_ANNUAL ||
  env.STRIPE_PRICE_SUPPORT_MONTHLY ||
  "";
const proId =
  env.STRIPE_PRICE_PRO_YEARLY ||
  env.STRIPE_PRICE_PRO_MONTHLY ||
  env.STRIPE_PRICE_MEMBER_MONTHLY ||
  "";

console.log("[verify:preview-pricing] Checking preview Stripe prices…");

let supportPriceId = supportId;
if (supportId) {
  const p = await stripeGet(key, `prices/${supportId}`);
  const ok = p.unit_amount === SUPPORT_CENTS && p.recurring?.interval === "year" && p.active !== false;
  console.log(
    ok ? "OK" : "FAIL",
    `Support ${supportId}: $${((p.unit_amount ?? 0) / 100).toFixed(2)}/${p.recurring?.interval || "?"}`,
  );
  if (!ok) supportPriceId = null;
}

if (!supportPriceId) {
  const list = await stripeGet(key, "prices?limit=100&active=true");
  const found = (list.data || []).find(
    (p) => p.recurring?.interval === "year" && p.unit_amount === SUPPORT_CENTS && p.currency === "usd",
  );
  if (found) {
    supportPriceId = found.id;
    console.log("[verify:preview-pricing] Found correct Support yearly price:", supportPriceId);
  } else {
    const created = await stripePost(key, "prices", {
      product: "prod_UcoTs8uBPBbajz",
      unit_amount: String(SUPPORT_CENTS),
      currency: "usd",
      "recurring[interval]": "year",
      nickname: "Support Annual $0.99/year (QA)",
    });
    supportPriceId = created.id;
    console.log("[verify:preview-pricing] Created Support yearly price:", supportPriceId);
  }
}

if (proId) {
  const p = await stripeGet(key, `prices/${proId}`);
  const ok = p.unit_amount === PRO_CENTS && p.recurring?.interval === "year" && p.active !== false;
  console.log(
    ok ? "OK" : "WARN",
    `Pro ${proId}: $${((p.unit_amount ?? 0) / 100).toFixed(2)}/${p.recurring?.interval || "?"}`,
  );
  if (!ok) {
    console.log("[verify:preview-pricing] Preview Pro may be monthly fallback — set STRIPE_PRICE_PRO_YEARLY in Vercel preview if needed.");
  }
}

const needsEnvUpdate = supportPriceId && supportPriceId !== supportId;
if (needsEnvUpdate) {
  console.log("\n[verify:preview-pricing] Updating Vercel preview env…");
  for (const name of ["STRIPE_PRICE_SUPPORT_YEARLY", "STRIPE_PRICE_SUPPORT_ANNUAL"]) {
    const r = spawnSync(
      "vercel",
      ["env", "add", name, "preview", "--value", supportPriceId, "--force", "--yes"],
      { cwd: webRoot, stdio: "inherit", shell: true },
    );
    if (r.status !== 0) {
      console.error(`[verify:preview-pricing] Failed to set ${name}`);
      process.exit(1);
    }
  }
  console.log("[verify:preview-pricing] Preview env updated.");
} else {
  console.log("[verify:preview-pricing] Preview Support env already correct.");
}

console.log("\n# Preview env values:");
console.log(`STRIPE_PRICE_SUPPORT_YEARLY=${supportPriceId}`);
