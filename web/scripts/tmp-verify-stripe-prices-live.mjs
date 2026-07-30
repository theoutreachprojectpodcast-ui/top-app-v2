/**
 * Verify live Stripe price amounts (reads .env.vercel.production.pull locally).
 * Outputs price nicknames and dollar amounts only — never prints secrets.
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[s.slice(0, i).trim()] = v.replace(/\r\n$/, "");
  }
  return env;
}

const envFile = path.join(process.cwd(), ".env.vercel.production.pull");
const env = loadEnv(envFile);
const key = env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY in .env.vercel.production.pull");
  process.exit(1);
}

const candidates = [
  ["STRIPE_PRICE_SUPPORT_ANNUAL", env.STRIPE_PRICE_SUPPORT_ANNUAL],
  ["STRIPE_PRICE_SUPPORT_YEARLY", env.STRIPE_PRICE_SUPPORT_YEARLY],
  ["STRIPE_PRICE_PRO_YEARLY", env.STRIPE_PRICE_PRO_YEARLY],
  ["STRIPE_PRICE_SUPPORT_MONTHLY", env.STRIPE_PRICE_SUPPORT_MONTHLY],
  ["STRIPE_PRICE_MEMBER_MONTHLY", env.STRIPE_PRICE_MEMBER_MONTHLY],
  ["STRIPE_PRICE_ACCESS_YEARLY", env.STRIPE_PRICE_ACCESS_YEARLY],
  ["health_accessYearly", "price_1TlcSuCiwOqAGcUDjI8CtQTH"],
  ["health_member", "price_1TdYr2CiwOqAGcUDmjZFz4W1"],
];

const seen = new Set();
let mismatch = 0;

for (const [label, id] of candidates) {
  const priceId = String(id || "").trim();
  if (!priceId || seen.has(priceId)) continue;
  seen.add(priceId);

  const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const p = await res.json();
  if (p.error) {
    console.log(JSON.stringify({ label, priceId, ok: false, error: p.error.message }));
    mismatch += 1;
    continue;
  }

  const amount = (p.unit_amount ?? 0) / 100;
  const interval = p.recurring?.interval || "one_time";
  const expected =
    label.includes("support") || label.includes("access") || priceId.includes("1TlcSu")
      ? { amount: 99, interval: "year" }
      : label.includes("member") || label.includes("pro") || priceId.includes("1TdYr")
        ? { amount: 5.99, interval: "year" }
        : null;

  const amountOk = expected ? Math.abs(amount - expected.amount) < 0.01 : null;
  const intervalOk = expected ? interval === expected.interval : null;
  const ok = expected ? amountOk && intervalOk : true;
  if (!ok) mismatch += 1;

  console.log(
    JSON.stringify({
      label,
      priceId,
      nickname: p.nickname || null,
      amount,
      currency: p.currency,
      interval,
      active: p.active,
      expected: expected || undefined,
      ok,
    }),
  );
}

process.exit(mismatch > 0 ? 1 : 0);
