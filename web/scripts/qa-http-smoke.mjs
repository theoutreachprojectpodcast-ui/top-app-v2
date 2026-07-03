/**
 * QA HTTP smoke — parity with production smoke for QA validation before merge to main.
 *
 *   QA_BASE_URL=https://qa-the-outreach-project.vercel.app pnpm --dir web run smoke:qa:http
 */
const baseRaw =
  process.env.QA_BASE_URL ||
  process.argv[2] ||
  "https://qa-the-outreach-project.vercel.app";
const base = String(baseRaw).replace(/\/$/, "");
const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();

function headers(extra = {}) {
  const h = { ...extra };
  if (bypass) h["x-vercel-protection-bypass"] = bypass;
  return h;
}

const checks = [
  { name: "homepage", path: "/", kind: "html", expect: [200] },
  { name: "sign-in", path: "/sign-in", kind: "html", expect: [200] },
  { name: "sign-up", path: "/sign-up", kind: "html", expect: [200] },
  { name: "community", path: "/community", kind: "html", expect: [200] },
  { name: "trusted resources", path: "/trusted", kind: "html", expect: [200] },
  { name: "nonprofit directory", path: "/directory", kind: "html", expect: [200, 404] },
  { name: "podcasts", path: "/podcasts", kind: "html", expect: [200] },
  { name: "privacy", path: "/privacy", kind: "html", expect: [200] },
  { name: "terms", path: "/terms", kind: "html", expect: [200] },
  { name: "contact", path: "/contact", kind: "html", expect: [200] },
  { name: "mobile auth start", path: "/mobile/auth/start", kind: "html", expect: [200] },
  { name: "health aggregate", path: "/api/health", kind: "json", expect: [200] },
  { name: "health auth", path: "/api/health/auth", kind: "json", expect: [200] },
  { name: "health db", path: "/api/health/db", kind: "json", expect: [200] },
  { name: "health env", path: "/api/health/env", kind: "json", expect: [200] },
  { name: "health mobile", path: "/api/health/mobile", kind: "json", expect: [200] },
  { name: "health stripe", path: "/api/health/stripe", kind: "json", expect: [200] },
  { name: "auth status", path: "/api/auth/status", kind: "json", expect: [200] },
  { name: "api me", path: "/api/me", kind: "json", expect: [200] },
  { name: "billing capabilities", path: "/api/billing/capabilities", kind: "json", expect: [200] },
  {
    name: "callback guard",
    path: "/callback",
    kind: "html",
    expect: [400],
    redirect: "manual",
  },
  {
    name: "mobile callback alias",
    path: "/mobile/auth/callback",
    kind: "html",
    expect: [302, 307, 400],
    redirect: "manual",
  },
];

let failed = false;

for (const check of checks) {
  const url = `${base}${check.path}`;
  try {
    const res = await fetch(url, {
      redirect: check.redirect || "follow",
      headers: headers({
        Accept: check.kind === "json" ? "application/json, */*" : "text/html, */*",
      }),
    });
    const text = await res.text();

    if (res.status === 401 && !bypass) {
      console.error(`[smoke:qa] FAIL ${check.name} -> 401 (set VERCEL_AUTOMATION_BYPASS_SECRET)`);
      failed = true;
      continue;
    }
    if (!check.expect.includes(res.status)) {
      console.error(`[smoke:qa] FAIL ${check.name} -> HTTP ${res.status} (expected ${check.expect.join("|")})`);
      failed = true;
      continue;
    }
    if (res.status >= 500) {
      console.error(`[smoke:qa] FAIL ${check.name} -> HTTP ${res.status}`);
      failed = true;
      continue;
    }
    if (check.kind === "json" && res.status === 200) {
      try {
        JSON.parse(text);
      } catch {
        console.error(`[smoke:qa] FAIL ${check.name} -> invalid JSON`);
        failed = true;
        continue;
      }
    }
    console.log(`[smoke:qa] OK ${check.name} -> ${res.status}`);
  } catch (e) {
    console.error(`[smoke:qa] FAIL ${check.name} -> ${e?.message || e}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`[smoke:qa] All QA parity checks passed for ${base}`);
