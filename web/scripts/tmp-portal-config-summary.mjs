/**
 * Summarize Stripe Billing Portal configuration (features enabled).
 * Usage: node scripts/tmp-portal-config-summary.mjs [.env-file]
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
    env[s.slice(0, i).trim()] = v;
  }
  return env;
}

const envFile = path.join(process.cwd(), process.argv[2] || ".env.production.local");
const env = loadEnv(envFile);
const key = env.STRIPE_SECRET_KEY?.trim();
const explicitConfig = env.STRIPE_BILLING_PORTAL_CONFIGURATION?.trim() || "";

if (!key) {
  console.error(JSON.stringify({ ok: false, error: "missing_STRIPE_SECRET_KEY", envFile: path.basename(envFile) }));
  process.exit(1);
}

const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";
const headers = { Authorization: `Bearer ${key}` };

let configId = explicitConfig;
if (!configId) {
  const res = await fetch("https://api.stripe.com/v1/billing_portal/configurations?limit=1", { headers });
  const data = await res.json();
  configId = data?.data?.[0]?.id || "";
}

if (!configId) {
  console.log(JSON.stringify({ ok: false, mode, error: "no_portal_configuration" }));
  process.exit(1);
}

const res = await fetch(`https://api.stripe.com/v1/billing_portal/configurations/${configId}`, { headers });
const cfg = await res.json();
if (cfg.error) {
  console.log(JSON.stringify({ ok: false, mode, configId, error: cfg.error.message }));
  process.exit(1);
}

const features = cfg.features || {};
const summary = {
  ok: cfg.active !== false,
  mode,
  configId: cfg.id,
  active: cfg.active,
  is_default: cfg.is_default,
  business_profile: {
    headline: cfg.business_profile?.headline || null,
    privacy_policy_url: cfg.business_profile?.privacy_policy_url || null,
    terms_of_service_url: cfg.business_profile?.terms_of_service_url || null,
  },
  features: {
    customer_update: features.customer_update?.enabled ?? null,
    invoice_history: features.invoice_history?.enabled ?? null,
    payment_method_update: features.payment_method_update?.enabled ?? null,
    subscription_cancel: features.subscription_cancel?.enabled ?? null,
    subscription_update: features.subscription_update?.enabled ?? null,
    subscription_pause: features.subscription_pause?.enabled ?? null,
  },
};

console.log(JSON.stringify(summary, null, 2));
