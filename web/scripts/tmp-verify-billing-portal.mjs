/**
 * Verify Stripe Customer Portal can create a session (no secrets printed).
 * Usage: node scripts/tmp-verify-billing-portal.mjs [.env-file]
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

const envFile = path.join(process.cwd(), process.argv[2] || ".env.local");
const env = loadEnv(envFile);
const key = env.STRIPE_SECRET_KEY?.trim();
const portalConfigId = env.STRIPE_BILLING_PORTAL_CONFIGURATION?.trim() || "";

if (!key) {
  console.error(JSON.stringify({ ok: false, envFile, error: "missing_STRIPE_SECRET_KEY" }));
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/x-www-form-urlencoded",
};

async function stripeForm(path, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers,
    body,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, { headers: { Authorization: `Bearer ${key}` } });
  const data = await res.json();
  return { status: res.status, data };
}

const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";

let configCheck = null;
if (portalConfigId) {
  const { status, data } = await stripeGet(`/billing_portal/configurations/${portalConfigId}`);
  configCheck = {
    configured: status === 200,
    status,
    id: data.id || portalConfigId,
    active: data.active ?? null,
    is_default: data.is_default ?? null,
    error: data.error?.message || null,
  };
} else {
  const { status, data } = await stripeGet("/billing_portal/configurations?limit=3");
  const configs = Array.isArray(data.data) ? data.data : [];
  configCheck = {
    configured: status === 200 && configs.length > 0,
    status,
    count: configs.length,
    defaultActive: configs.find((c) => c.is_default)?.active ?? configs[0]?.active ?? null,
    ids: configs.map((c) => c.id),
  };
}

const customerRes = await stripeForm("/customers", {
  email: `portal-verify+${Date.now()}@example.com`,
  "metadata[source]": "tmp-verify-billing-portal",
});
const customerId = customerRes.data?.id;
if (!customerId) {
  console.log(
    JSON.stringify({
      ok: false,
      envFile: path.basename(envFile),
      mode,
      portalConfigId: portalConfigId || null,
      configCheck,
      error: customerRes.data?.error?.message || "customer_create_failed",
    }),
  );
  process.exit(1);
}

const portalParams = {
  customer: customerId,
  return_url: "http://localhost:3000/profile",
};
if (portalConfigId) portalParams.configuration = portalConfigId;

const portalRes = await stripeForm("/billing_portal/sessions", portalParams);
const portalUrl = portalRes.data?.url || "";
const portalOk = portalRes.status === 200 && !!portalUrl;

// cleanup ephemeral customer
await stripeForm(`/customers/${customerId}`, {}); // DELETE needs different method
await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${key}` },
});

console.log(
  JSON.stringify(
    {
      ok: portalOk,
      envFile: path.basename(envFile),
      mode,
      portalConfigId: portalConfigId || null,
      configCheck,
      portalSession: {
        status: portalRes.status,
        hasUrl: !!portalUrl,
        error: portalRes.data?.error?.message || null,
        code: portalRes.data?.error?.code || null,
      },
    },
    null,
    2,
  ),
);

process.exit(portalOk ? 0 : 1);
