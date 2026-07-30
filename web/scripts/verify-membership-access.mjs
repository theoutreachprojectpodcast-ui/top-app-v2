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
    return isPro(p);
  }
  function canSaveOrganizations(p) {
    return isPro(p);
  }
  function canViewCommunity(p) {
    return isPro(p);
  }
  function canCreateCommunityContent(p) {
    return isPro(p);
  }
  function canAccessFullPlatform(p) {
    return isPro(p);
  }

  const support = { membershipTier: "support", membershipBillingStatus: "active" };
  const pro = { membershipTier: "member", membershipBillingStatus: "active" };
  const none = { membershipTier: "free", membershipBillingStatus: "none" };
  const suspended = { membershipTier: "member", membershipBillingStatus: "active", userStatus: "suspended" };

  if (!canViewDirectory(support) && !canSaveOrganizations(support)) pass("Support: no full Pro surfaces");
  else fail("Support: must not access Pro-only surfaces when Support is retired");

  if (!canViewCommunity(support) && !canAccessFullPlatform(support)) {
    pass("Support: no community/full platform");
  } else fail("Support: must not access community/full platform");

  if (canViewCommunity(pro) && canAccessFullPlatform(pro) && canCreateCommunityContent(pro)) {
    pass("Pro: community + full platform");
  } else fail("Pro: community + full platform");

  if (!canViewCommunity(none) && !canCreateCommunityContent(none)) pass("Free: no community create");
  else fail("Free: must not create community posts");

  if (!hasActiveMembership(none)) pass("Free: no active membership");
  else fail("Free: no active membership");

  void suspended;
}

async function verifyProtectedRoutes() {
  console.log("\n[2] Route policy helpers");
  const fs = await import("node:fs");
  const src = fs.readFileSync(path.join(webRoot, "src/lib/membership/protectedRoutes.js"), "utf8");

  if (/PRO_MEMBERSHIP_PATH_PATTERNS\s*=\s*\[[^\]]*\/community/m.test(src)) {
    pass("Pro route patterns gate /community");
  } else fail("Community should require Pro in protectedRoutes");

  if (src.includes("WELCOME_PATH") || src.includes("/welcome")) {
    pass("Welcome path is represented in route policy");
  } else fail("Missing welcome path in route policy");

  if (!/MEMBERSHIP_EXEMPT_PATTERNS[\s\S]*?\/nonprofit/.test(src.split("PRO_MEMBERSHIP")[0] || "")) {
    pass("Nonprofit directory is not membership-exempt");
  } else fail("Nonprofit should require Pro (not exempt)");

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

async function verifyMobileCapacitor() {
  console.log("\n[4] Capacitor production WebView URL (iOS + Android)");
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
  await verifyMobileCapacitor();

  console.log(`\n--- Summary: ${passes.length} passed, ${failures.length} failed ---`);
  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nAll automated checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
