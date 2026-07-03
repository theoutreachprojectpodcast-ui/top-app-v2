/**
 * Create or locate Support Membership $0.99/year Stripe price (live or test per STRIPE_SECRET_KEY).
 * Deactivates the known incorrect $99/year price when found.
 *
 * Usage:
 *   node scripts/create-support-yearly-price.mjs
 *   node scripts/create-support-yearly-price.mjs --env-file .env.vercel.production
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPPORT_PRODUCT = "prod_UcoTs8uBPBbajz";
const PRO_YEARLY_EXISTING = "price_1TgYKiCiwOqAGcUDFErxunzP";
const INCORRECT_SUPPORT_PRICE = "price_1TlqQ9CiwOqAGcUDuZkKPlJ2";
const SUPPORT_ANNUAL_CENTS = 99;
const PRO_ANNUAL_CENTS = 599;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    let value = s.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
if (envFileArg) {
  loadEnvFile(path.resolve(process.cwd(), envFileArg.slice("--env-file=".length)));
} else {
  loadEnvFile(path.join(__dirname, "../.env.local"));
  loadEnvFile(path.join(__dirname, "../.env.vercel.production"));
}

const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

async function stripe(method, pathname, params) {
  const init = { method, headers: { Authorization: `Bearer ${key}` } };
  if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params);
  }
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, init);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "stripe_error");
  return data;
}

async function main() {
  const list = await stripe("GET", "prices?limit=100&active=true");
  let supportYearly = (list.data || []).find(
    (p) =>
      p.product === SUPPORT_PRODUCT &&
      p.recurring?.interval === "year" &&
      p.unit_amount === SUPPORT_ANNUAL_CENTS &&
      p.currency === "usd",
  );

  if (!supportYearly) {
    supportYearly = await stripe("POST", "prices", {
      product: SUPPORT_PRODUCT,
      unit_amount: String(SUPPORT_ANNUAL_CENTS),
      currency: "usd",
      "recurring[interval]": "year",
      nickname: "Support Annual $0.99/year",
    });
    console.log(JSON.stringify({ action: "created", id: supportYearly.id, amount: 0.99, interval: "year" }));
  } else {
    console.log(JSON.stringify({ action: "exists", id: supportYearly.id, amount: 0.99, interval: "year" }));
  }

  for (const p of list.data || []) {
    if (
      p.recurring?.interval === "year" &&
      p.unit_amount === 9900 &&
      p.currency === "usd" &&
      p.active !== false
    ) {
      await stripe("POST", `prices/${p.id}`, { active: "false" });
      console.log(JSON.stringify({ action: "deactivated_incorrect", id: p.id, amount: 99 }));
    }
  }

  try {
    const bad = await stripe("GET", `prices/${INCORRECT_SUPPORT_PRICE}`);
    if (bad.active !== false) {
      await stripe("POST", `prices/${INCORRECT_SUPPORT_PRICE}`, { active: "false" });
      console.log(JSON.stringify({ action: "deactivated_known_bad", id: INCORRECT_SUPPORT_PRICE }));
    }
  } catch {
    /* price may not exist in test mode */
  }

  const pro = await stripe("GET", `prices/${PRO_YEARLY_EXISTING}`);
  const proOk =
    pro.unit_amount === PRO_ANNUAL_CENTS &&
    pro.recurring?.interval === "year" &&
    pro.currency === "usd" &&
    pro.active !== false;
  console.log(
    JSON.stringify({
      proYearly: {
        id: pro.id,
        amount: (pro.unit_amount ?? 0) / 100,
        interval: pro.recurring?.interval,
        active: pro.active,
        ok: proOk,
      },
    }),
  );
  if (!proOk) {
    console.error("Pro yearly price does not match $5.99/year — verify in Stripe Dashboard.");
    process.exit(1);
  }

  console.log("\n# Set in Vercel Production (+ Preview/QA test mirrors):");
  console.log(`STRIPE_PRICE_SUPPORT_YEARLY=${supportYearly.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${PRO_YEARLY_EXISTING}`);
  console.log(`STRIPE_BLOCKED_PRICE_IDS=${INCORRECT_SUPPORT_PRICE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
