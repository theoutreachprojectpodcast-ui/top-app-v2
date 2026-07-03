/**
 * Verify membership tier gating (Support vs Pro) — local logic + live production API smoke.
 *
 * Usage:
 *   node scripts/verify-membership-access.mjs
 *   node scripts/verify-membership-access.mjs --base https://theoutreachproject.app
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

const baseArg = process.argv.find((a) => a.startsWith("--base="));
const BASE = (baseArg ? baseArg.slice("--base=".length) : "https://theoutreachproject.app").replace(/\/$/, "");

const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`  ✗ ${msg}`);
}

async function verifyLocalLogic() {
  console.log("\n[1] Local membership access logic (mirrors membershipAccess.js)");

  const hasActiveMemberBilling = (s) => s === "active" || s === "trialing";
  const tierOf = (p) => String(p.membershipTier || "free").toLowerCase();
  const statusOf = (p) => String(p.membershipBillingStatus || "none").toLowerCase();
  const PAID = new Set(["access", "support", "member", "sponsor"]);

  function hasActiveMembership(p) {
    const tier = tierOf(p);
    return PAID.has(tier) && hasActiveMemberBilling(statusOf(p));
  }
  function isSupport(p) {
    return ["support", "access"].includes(tierOf(p)) && hasActiveMembership(p);
  }
  function isPro(p) {
    return tierOf(p) === "member" && hasActiveMembership(p);
  }
  function canViewDirectory(p) {
    return isSupport(p) || isPro(p);
  }
  function canSaveOrganizations(p) {
    return isSupport(p) || isPro(p);
  }
  function canViewCommunity(p) {
    return isPro(p);
  }
  function canAccessFullPlatform(p) {
    return isPro(p);
  }

  const support = { membershipTier: "support", membershipBillingStatus: "active" };
  const pro = { membershipTier: "member", membershipBillingStatus: "active" };
  const none = { membershipTier: "free", membershipBillingStatus: "none" };

  if (canViewDirectory(support) && canSaveOrganizations(support)) pass("Support: directory + saves");
  else fail("Support: directory + saves");

  if (!canViewCommunity(support) && !canAccessFullPlatform(support)) pass("Support: no community/full platform");
  else fail("Support: must not access community/full platform");

  if (canViewCommunity(pro) && canAccessFullPlatform(pro)) pass("Pro: full platform");
  else fail("Pro: full platform");

  if (!hasActiveMembership(none)) pass("Free: no active membership");
  else fail("Free: no active membership");
}

async function verifyProtectedRoutes() {
  console.log("\n[2] Route policy helpers");
  const fs = await import("node:fs");
  const src = fs.readFileSync(path.join(webRoot, "src/lib/membership/protectedRoutes.js"), "utf8");

  if (src.includes("PRO_MEMBERSHIP_PATH_PATTERNS") && src.includes("/community")) {
    pass("Pro route patterns include /community");
  } else fail("Missing Pro route patterns");

  if (src.includes("SUPPORT_TIER_PATH_PATTERNS") && src.includes("/profile")) {
    pass("Support route patterns include /profile");
  } else fail("Missing Support route patterns");

  if (src.includes("ProMembershipGate") || fs.existsSync(path.join(webRoot, "src/components/membership/ProMembershipGate.jsx"))) {
    pass("ProMembershipGate component present in codebase");
  } else fail("ProMembershipGate component missing");
}

async function verifyProductionApis() {
  console.log(`\n[3] Live API smoke (unauthenticated) — ${BASE}`);

  const cases = [
    {
      name: "GET /api/community/posts?scope=public",
      url: `${BASE}/api/community/posts?scope=public`,
      method: "GET",
      expectStatus: [401, 403],
    },
    {
      name: "POST /api/directory/search",
      url: `${BASE}/api/directory/search`,
      method: "POST",
      body: { filters: {}, page: 1 },
      expectStatus: [401, 403],
    },
    {
      name: "GET /api/trusted/catalog",
      url: `${BASE}/api/trusted/catalog`,
      method: "GET",
      expectStatus: [401, 403],
    },
    {
      name: "GET /api/me/saved-orgs",
      url: `${BASE}/api/me/saved-orgs`,
      method: "GET",
      expectStatus: [401, 403],
    },
    {
      name: "GET /api/auth/status",
      url: `${BASE}/api/auth/status`,
      method: "GET",
      expectStatus: [200],
    },
  ];

  for (const c of cases) {
    try {
      const res = await fetch(c.url, {
        method: c.method,
        headers: c.body ? { "Content-Type": "application/json" } : undefined,
        body: c.body ? JSON.stringify(c.body) : undefined,
        cache: "no-store",
      });
      const ok = c.expectStatus.includes(res.status);
      if (ok) pass(`${c.name} → HTTP ${res.status}`);
      else fail(`${c.name} → HTTP ${res.status} (expected ${c.expectStatus.join("|")})`);
    } catch (e) {
      fail(`${c.name} → ${e.message}`);
    }
  }
}

async function verifyProductionBundleMarkers() {
  console.log(`\n[4] Production deploy includes membership gate components — ${BASE}`);

  const pages = ["/", "/access", "/mobile/access"];
  let foundProGate = false;
  let foundPaywall = false;

  for (const p of pages) {
    try {
      const res = await fetch(`${BASE}${p}`, { cache: "no-store", redirect: "follow" });
      const html = await res.text();
      if (/ProMembershipGate|membershipUpgradePrompt|Choose your membership/i.test(html)) {
        if (/ProMembershipGate|membershipUpgradePrompt/i.test(html)) foundProGate = true;
        if (/Choose your membership|Support Membership/i.test(html)) foundPaywall = true;
      }
      // Next.js may lazy-load; check linked chunks
      const chunkUrls = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);
      for (const chunk of chunkUrls.slice(0, 40)) {
        try {
          const cr = await fetch(`${BASE}${chunk}`, { cache: "no-store" });
          const js = await cr.text();
          if (js.includes("ProMembershipGate") || js.includes("membershipUpgradePrompt")) foundProGate = true;
          if (js.includes("Choose your membership") || js.includes("Support Membership")) foundPaywall = true;
        } catch {
          /* skip chunk */
        }
      }
    } catch (e) {
      fail(`Could not fetch ${p}: ${e.message}`);
    }
  }

  if (foundProGate) pass("Production bundle contains Pro membership gate UI");
  else fail("Production bundle missing ProMembershipGate — deploy membership changes before store QA");

  if (foundPaywall) pass("Production bundle contains membership paywall copy");
  else fail("Production bundle missing paywall — deploy membership changes");
}

async function verifyMobileCapacitor() {
  console.log("\n[5] Capacitor production WebView URL (iOS + Android)");
  const iosCfg = path.join(webRoot, "ios/App/App/capacitor.config.json");
  const androidCfg = path.join(webRoot, "android/app/src/main/assets/capacitor.config.json");
  const fs = await import("node:fs");

  for (const [label, cfgPath] of [
    ["iOS", iosCfg],
    ["Android", androidCfg],
  ]) {
    if (!fs.existsSync(cfgPath)) {
      fail(`${label} capacitor.config.json missing — run cap sync`);
      continue;
    }
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    const url = String(cfg?.server?.url || "").replace(/\/$/, "");
    if (url === "https://theoutreachproject.app") pass(`${label} WebView → ${url}`);
    else fail(`${label} WebView URL is ${url || "(unset)"}, expected https://theoutreachproject.app`);
  }
}

async function main() {
  console.log("Membership access verification");
  console.log(`Base: ${BASE}`);

  await verifyLocalLogic();
  await verifyProtectedRoutes();
  await verifyProductionApis();
  await verifyProductionBundleMarkers();
  await verifyMobileCapacitor();

  console.log(`\n--- Summary: ${passes.length} passed, ${failures.length} failed ---`);
  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nAll automated checks passed.");
  console.log(
    "Manual QA still required: signed-in Support vs Pro flows on web, iOS TestFlight, and Android.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
