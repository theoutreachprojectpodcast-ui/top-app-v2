/**
 * Production HTTP smoke — run before/after promoting production deploy.
 *
 *   PRODUCTION_BASE_URL=https://theoutreachproject.app pnpm --dir web run smoke:production:http
 */
const baseRaw = process.env.PRODUCTION_BASE_URL || process.argv[2] || "https://theoutreachproject.app";
const base = String(baseRaw).replace(/\/$/, "");
const bypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();
const CAP_UA = "TheOutreachProject/Capacitor ProductionSmoke/1.0";

function headers(extra = {}) {
  const h = { ...extra };
  if (bypass) h["x-vercel-protection-bypass"] = bypass;
  return h;
}

async function probe(path, opts = {}) {
  const kind = opts.kind || "html";
  const url = `${base}${path}`;
  const res = await fetch(url, {
    redirect: opts.redirect || "follow",
    headers: headers({
      Accept: kind === "json" ? "application/json, */*" : "text/html, */*",
      ...(opts.ua ? { "User-Agent": opts.ua } : {}),
    }),
  });
  const text = await res.text();
  let setCookie = res.headers.get("set-cookie") || "";
  if (typeof res.headers.getSetCookie === "function") {
    setCookie = res.headers.getSetCookie().join("; ");
  }
  let json = null;
  if (kind === "json" && res.status === 200) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { path, status: res.status, text, setCookie, json };
}

const checks = [
  { name: "homepage", path: "/", expect: [200] },
  { name: "sign-in", path: "/sign-in", expect: [200] },
  { name: "sign-up", path: "/sign-up", expect: [200] },
  { name: "health aggregate", path: "/api/health", kind: "json", expect: [200], requireOk: true },
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
  { name: "community page", path: "/community", expect: [200] },
  { name: "trusted resources", path: "/trusted", expect: [200] },
  { name: "podcasts", path: "/podcasts", expect: [200] },
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
    console.log(`[smoke:production] OK ${check.name} -> ${res.status}`);
  } catch (e) {
    console.error(`[smoke:production] FAIL ${check.name} -> ${e?.message || e}`);
    failed = true;
  }
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
} catch {
  console.log("[smoke:production] OK outreachproject.app does not resolve (expected)");
}

if (failed) process.exit(1);
if (warned) console.log("[smoke:production] Extended checks pending deploy (404 warnings only)");
console.log(`[smoke:production] All core checks passed for ${base}`);
