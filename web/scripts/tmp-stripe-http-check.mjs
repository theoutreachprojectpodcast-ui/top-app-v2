/**
 * Stripe-related HTTP checks (no auth). Usage: node scripts/tmp-stripe-http-check.mjs <baseUrl>
 */

const base = String(process.argv[2] || "").replace(/\/$/, "");
if (!base) {
  console.error("Usage: node scripts/tmp-stripe-http-check.mjs <baseUrl>");
  process.exit(1);
}

const checks = [
  { name: "capabilities", path: "/api/billing/capabilities", method: "GET" },
  { name: "auth-status", path: "/api/auth/status", method: "GET" },
  { name: "sponsor-opportunities", path: "/api/billing/sponsor-opportunities", method: "GET" },
  {
    name: "checkout-unauth",
    path: "/api/billing/checkout",
    method: "POST",
    body: JSON.stringify({ tier: "support" }),
    expectStatus: [401, 403],
  },
  { name: "webhook-get", path: "/api/billing/webhook", method: "GET", expectStatus: [405, 404, 400] },
];

let failed = 0;

for (const c of checks) {
  try {
    const res = await fetch(`${base}${c.path}`, {
      method: c.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: base,
      },
      body: c.method === "POST" ? c.body : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { _raw: text.slice(0, 80) };
    }
    const expect = c.expectStatus || [200];
    const ok = expect.includes(res.status);
    if (!ok) failed += 1;
    console.log(
      JSON.stringify({
        check: c.name,
        status: res.status,
        ok,
        ...(c.name === "capabilities" ? { body: data } : {}),
        ...(c.name === "auth-status"
          ? {
              stripe: data?.stripe,
              stripeMemberRecurring: data?.stripeMemberRecurring,
              stripeWebhook: data?.stripeWebhook,
              stripeMemberRecurringMissingEnv: data?.stripeMemberRecurringMissingEnv,
            }
          : {}),
        ...(c.name === "checkout-unauth" && !ok ? { snippet: text.slice(0, 120) } : {}),
        ...(String(data?._raw || "").includes("Authentication Required") ? { vercelProtection: true } : {}),
      }),
    );
  } catch (e) {
    failed += 1;
    console.log(JSON.stringify({ check: c.name, ok: false, error: String(e.message || e) }));
  }
}

process.exit(failed > 0 ? 1 : 0);
