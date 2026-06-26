/**
 * Create or locate Support $0.99/year Stripe price in TEST mode and update Preview (QA) env.
 * Requires STRIPE_SECRET_KEY=sk_test_… (Preview QA custom environment).
 *
 * Usage (on Vercel QA deployment shell or with sk_test in env):
 *   node scripts/setup-qa-support-yearly-price.mjs
 */
import { spawnSync } from "node:child_process";

const SUPPORT_CENTS = 99;
const PRO_CENTS = 599;
const SUPPORT_PRODUCT = "prod_UcoTs8uBPBbajz";

function env(name) {
  return String(process.env[name] || "").replace(/[\r\n]+/g, "").trim();
}

async function stripe(method, pathname, params) {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  if (!key.startsWith("sk_test_")) {
    throw new Error("QA setup requires Stripe TEST secret key (sk_test_…), not live.");
  }
  const init = { method, headers: { Authorization: `Bearer ${key}` } };
  if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params);
  }
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, init);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function findOrCreateSupportYearly() {
  const list = await stripe("GET", "prices?limit=100&active=true");
  let support = (list.data || []).find(
    (p) =>
      p.recurring?.interval === "year" &&
      p.unit_amount === SUPPORT_CENTS &&
      p.currency === "usd" &&
      p.active !== false,
  );
  if (!support) {
    support = await stripe("POST", "prices", {
      product: SUPPORT_PRODUCT,
      unit_amount: String(SUPPORT_CENTS),
      currency: "usd",
      "recurring[interval]": "year",
      nickname: "Support Annual $0.99/year (QA test)",
    });
    console.log("[setup:qa-support-yearly] Created test Support yearly price:", support.id);
  } else {
    console.log("[setup:qa-support-yearly] Found test Support yearly price:", support.id);
  }
  return support.id;
}

async function verifyProYearly(proId) {
  if (!proId) {
    console.warn("[setup:qa-support-yearly] STRIPE_PRICE_PRO_YEARLY not set — configure manually.");
    return;
  }
  const p = await stripe("GET", `prices/${proId}`);
  const ok = p.unit_amount === PRO_CENTS && p.recurring?.interval === "year" && p.active !== false;
  console.log(
    ok ? "OK" : "WARN",
    `Pro ${proId}: $${((p.unit_amount ?? 0) / 100).toFixed(2)}/${p.recurring?.interval || "?"}`,
  );
}

function updateVercelPreviewQa(name, value) {
  const r = spawnSync(
    "vercel",
    ["env", "add", name, "preview", "--value", value, "--force", "--yes", "--git-branch", "qa"],
    { stdio: "inherit", shell: true },
  );
  if (r.status !== 0) throw new Error(`Failed to set ${name} on Preview (QA)`);
}

async function main() {
  const supportId = await findOrCreateSupportYearly();
  await verifyProYearly(env("STRIPE_PRICE_PRO_YEARLY") || env("STRIPE_PRICE_MEMBER_MONTHLY"));

  console.log("\n[setup:qa-support-yearly] Updating Vercel Preview (QA) branch env…");
  for (const name of ["STRIPE_PRICE_SUPPORT_YEARLY", "STRIPE_PRICE_SUPPORT_ANNUAL"]) {
    updateVercelPreviewQa(name, supportId);
  }
  console.log("[setup:qa-support-yearly] Done.");
  console.log(`STRIPE_PRICE_SUPPORT_YEARLY=${supportId}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
