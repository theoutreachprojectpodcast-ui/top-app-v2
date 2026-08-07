/**
 * Production HTTP smoke — run before/after promoting production deploy.
 *
 *   PRODUCTION_BASE_URL=https://theoutreachproject.app pnpm --dir web run smoke:production:http
 *
 * Optional:
 *   TOP_EXPECT_COMMIT=<full sha> — require x-top-commit / health.build.commitSha match
 */
const baseRaw = process.env.PRODUCTION_BASE_URL || process.argv[2] || "https://theoutreachproject.app";
const base = String(baseRaw).replace(/\/$/, "");
const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();
const expectCommit = String(process.env.TOP_EXPECT_COMMIT || "").trim().toLowerCase();
const CAP_UA = "TheOutreachProject/Capacitor ProductionSmoke/1.0";
const CANONICAL_HOST = "theoutreachproject.app";
const STALE_HOSTS = ["top-app-brown-alpha.vercel.app", "web-the-outreach-project.vercel.app"];

function headers(extra = {}) {
  const h = { ...extra };
  if (bypass) h["x-vercel-protection-bypass"] = bypass;
  return h;
}

const checks = [
  { name: "homepage", path: "/", expect: [200], document: true },
  { name: "sign-in", path: "/sign-in", expect: [200], document: true },
  { name: "sign-up", path: "/sign-up", expect: [200], document: true },
  { name: "health aggregate", path: "/api/health", kind: "json", expect: [200], requireOk: true, healthBuild: true },
  { name: "auth status", path: "/api/auth/status", kind: "json", expect: [200], workos: true },
  { name: "api me", path: "/api/me", kind: "json", expect: [200] },
  { name: "icon asset", path: "/icon-192.png", expect: [200] },
  { name: "manifest", path: "/manifest.webmanifest", expect: [200] },
  {
    name: "workos-go PKCE",
    path: "/auth/workos-go?mode=signin&returnTo=%2Fmobile%2Fauth%2Fcomplete&native=1",
    expect: [200, 302, 307],
    redirect: "manual",
    ua: CAP_UA,
    pkce: true,
  },
  { name: "callback guard", path: "/callback", expect: [400], redirect: "manual" },
  {
    name: "www redirect",
    path: "/",
    host: `www.${new URL(base).hostname}`,
    expect: [301, 302, 307, 308],
    redirect: "manual",
    wwwToApex: true,
  },
];

/** Pass after deploy — 404 warns until live. */
const extendedChecks = [
  { name: "mobile auth start", path: "/mobile/auth/start", expect: [200] },
  { name: "health auth", path: "/api/health/auth", kind: "json", expect: [200], requireOk: true },
  { name: "health db", path: "/api/health/db", kind: "json", expect: [200], requireOk: true },
  { name: "health env", path: "/api/health/env", kind: "json", expect: [200], requireOk: true },
  { name: "health mobile", path: "/api/health/mobile", kind: "json", expect: [200], requireOk: true },
  { name: "health stripe", path: "/api/health/stripe", kind: "json", expect: [200], requireOk: true },
  { name: "community page", path: "/community", expect: [200], document: true },
  { name: "trusted resources", path: "/trusted", expect: [200], document: true },
  { name: "podcasts", path: "/podcasts", expect: [200], document: true },
  { name: "profile page", path: "/profile", expect: [200], document: true },
  { name: "billing capabilities", path: "/api/billing/capabilities", kind: "json", expect: [200] },
  {
    name: "mobile callback alias",
    path: "/mobile/auth/callback",
    expect: [302, 307, 400],
    redirect: "manual",
  },
];

let failed = false;
let warned = false;
let seenCommit = "";

async function runCheck(check, { extended = false } = {}) {
  try {
    const url = check.host
      ? `${base.startsWith("https") ? "https" : "http"}://${check.host}${check.path}`
      : `${base}${check.path}`;
    const res = await fetch(url, {
      redirect: check.redirect || "follow",
      headers: headers({
        Accept: check.kind === "json" ? "application/json, */*" : "text/html, */*",
        ...(check.ua ? { "User-Agent": check.ua } : {}),
      }),
    });
    const text = await res.text();
    let setCookie = res.headers.get("set-cookie") || "";
    if (typeof res.headers.getSetCookie === "function") {
      setCookie = res.headers.getSetCookie().join("; ");
    }
    let json = null;
    if (check.kind === "json") {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (res.status === 401 && !bypass) {
      console.error(`[smoke:production] FAIL ${check.name} -> 401 (set VERCEL_AUTOMATION_BYPASS_SECRET)`);
      failed = true;
      return;
    }
    if (extended && res.status === 404) {
      console.warn(`[smoke:production] WARN ${check.name} -> 404 (deploy pending)`);
      warned = true;
      return;
    }
    if (!check.expect.includes(res.status)) {
      console.error(`[smoke:production] FAIL ${check.name} -> HTTP ${res.status} (expected ${check.expect.join("|")})`);
      failed = true;
      return;
    }
    if (res.status >= 500) {
      console.error(`[smoke:production] FAIL ${check.name} -> HTTP ${res.status}`);
      failed = true;
      return;
    }
    if (check.pkce && !/wos-auth-verifier=/.test(setCookie)) {
      console.error(`[smoke:production] FAIL ${check.name} — missing wos-auth-verifier`);
      failed = true;
      return;
    }
    if (check.requireOk && json && !json.ok) {
      console.error(`[smoke:production] FAIL ${check.name} — ok:false ${JSON.stringify(json).slice(0, 200)}`);
      failed = true;
      return;
    }
    if (check.workos && json && !json.workos) {
      console.error(`[smoke:production] FAIL ${check.name} — workos:false`);
      failed = true;
      return;
    }
    if (check.kind === "json" && res.status === 200 && json === null) {
      console.error(`[smoke:production] FAIL ${check.name} — invalid JSON`);
      failed = true;
      return;
    }
    if (check.wwwToApex) {
      const loc = String(res.headers.get("location") || "");
      if (loc && !loc.includes(CANONICAL_HOST)) {
        console.error(`[smoke:production] FAIL ${check.name} — www Location must target ${CANONICAL_HOST} (got ${loc})`);
        failed = true;
        return;
      }
    }
    if (check.document) {
      const cache = String(res.headers.get("cache-control") || "").toLowerCase();
      if (cache && !/max-age=0|no-store|must-revalidate/.test(cache)) {
        console.warn(`[smoke:production] WARN ${check.name} — unexpected Cache-Control: ${cache}`);
        warned = true;
      }
      const commitHeader = String(res.headers.get("x-top-commit") || "").toLowerCase();
      if (commitHeader) seenCommit = commitHeader;
      if (expectCommit && commitHeader && commitHeader !== expectCommit) {
        console.error(
          `[smoke:production] FAIL ${check.name} — x-top-commit ${commitHeader} != TOP_EXPECT_COMMIT ${expectCommit}`,
        );
        failed = true;
        return;
      }
    }
    if (check.healthBuild && json?.build) {
      const sha = String(json.build.commitSha || "").toLowerCase();
      if (sha) seenCommit = sha;
      if (expectCommit && sha && sha !== expectCommit) {
        console.error(
          `[smoke:production] FAIL ${check.name} — build.commitSha ${sha} != TOP_EXPECT_COMMIT ${expectCommit}`,
        );
        failed = true;
        return;
      }
      if (json.build.environment) {
        console.log(`[smoke:production] build env=${json.build.environment} commit=${json.build.commitShort || sha || "n/a"}`);
      }
    }
    console.log(`[smoke:production] OK ${check.name} -> ${res.status}`);
  } catch (e) {
    console.error(`[smoke:production] FAIL ${check.name} -> ${e?.message || e}`);
    failed = true;
  }
}

try {
  const host = new URL(base).hostname.toLowerCase();
  if (host !== CANONICAL_HOST && host !== `www.${CANONICAL_HOST}`) {
    console.warn(`[smoke:production] WARN base host is ${host} (canonical is ${CANONICAL_HOST})`);
    warned = true;
  } else {
    console.log(`[smoke:production] OK canonical host ${host}`);
  }
} catch {
  console.error(`[smoke:production] FAIL invalid PRODUCTION_BASE_URL ${base}`);
  failed = true;
}

for (const check of checks) {
  await runCheck(check);
}
for (const check of extendedChecks) {
  await runCheck(check, { extended: true });
}

// Wrong domain must NOT resolve (common user error)
try {
  await fetch("https://outreachproject.app/", { redirect: "manual" });
  console.warn("[smoke:production] WARN outreachproject.app resolves — users may hit wrong host");
  warned = true;
} catch {
  console.log("[smoke:production] OK outreachproject.app does not resolve (expected)");
}

// Stale Vercel projects must not be treated as the product (document + warn if still live).
for (const host of STALE_HOSTS) {
  try {
    const res = await fetch(`https://${host}/`, { redirect: "manual" });
    if (res.status === 200) {
      console.warn(
        `[smoke:production] WARN stale project still live: https://${host}/ (archive in Vercel; not the production product)`,
      );
      warned = true;
    } else {
      console.log(`[smoke:production] OK stale host ${host} -> ${res.status}`);
    }
  } catch {
    console.log(`[smoke:production] OK stale host ${host} unreachable`);
  }
}

if (expectCommit && !seenCommit) {
  console.warn(
    "[smoke:production] WARN TOP_EXPECT_COMMIT set but no commit marker observed yet (deploy may predate x-top-commit headers)",
  );
  warned = true;
} else if (seenCommit) {
  console.log(`[smoke:production] release commit ${seenCommit}`);
}

if (failed) process.exit(1);
if (warned) console.log("[smoke:production] Completed with warnings");
console.log(`[smoke:production] All core checks passed for ${base}`);
