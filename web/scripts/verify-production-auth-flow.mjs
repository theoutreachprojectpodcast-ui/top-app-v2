/**
 * Live production smoke: WorkOS must be the web sign-in path (not demo auth fallback).
 * Run after production deploys: `pnpm --dir web run verify:production-auth`
 */
const BASE = String(process.env.PRODUCTION_URL || "https://theoutreachproject.app").replace(/\/$/, "");

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", cache: "no-store" });
  const text = await res.text().catch(() => "");
  return { res, text };
}

console.log(`Production auth flow verification\nBase: ${BASE}\n`);

try {
  const statusRes = await fetch(`${BASE}/api/auth/status`, { cache: "no-store" });
  const status = await statusRes.json().catch(() => ({}));
  if (statusRes.ok && status.workos === true) {
    pass("GET /api/auth/status reports workos: true");
  } else {
    fail("GET /api/auth/status reports workos: true", `HTTP ${statusRes.status}, workos=${status.workos}`);
  }
} catch (e) {
  fail("GET /api/auth/status reports workos: true", e instanceof Error ? e.message : String(e));
}

try {
  const { res, text } = await fetchText("/auth/workos-go?mode=signin&returnTo=%2F");
  if (res.status === 200 && /authkit|workos|Sign in — The Outreach Project/i.test(text)) {
    pass("GET /auth/workos-go returns WorkOS AuthKit bridge HTML");
  } else {
    fail("GET /auth/workos-go returns WorkOS AuthKit bridge HTML", `HTTP ${res.status}`);
  }
  if (!/demo sign-in uses email and password/i.test(text)) {
    pass("WorkOS bridge HTML does not expose demo sign-in copy");
  } else {
    fail("WorkOS bridge HTML does not expose demo sign-in copy");
  }
} catch (e) {
  fail("GET /auth/workos-go returns WorkOS AuthKit bridge HTML", e instanceof Error ? e.message : String(e));
}

try {
  const { res, text } = await fetchText("/sign-in");
  if (res.status === 200 && text.length > 1000) {
    pass("GET /sign-in returns sign-in entry page");
  } else if (res.status >= 300 && res.status < 400) {
    pass(`GET /sign-in redirects (${res.status}) — acceptable handoff entry`);
  } else {
    fail("GET /sign-in returns sign-in entry page", `HTTP ${res.status}`);
  }
  if (!/stored on this device only/i.test(text)) {
    pass("/sign-in HTML does not advertise local demo auth");
  } else {
    fail("/sign-in HTML does not advertise local demo auth");
  }
} catch (e) {
  fail("GET /sign-in returns sign-in entry page", e instanceof Error ? e.message : String(e));
}

try {
  const { text } = await fetchText("/");
  if (!/Demo sign-in uses email and password stored on this device only/i.test(text)) {
    pass("Home HTML does not ship demo-only sign-in copy (SSR)");
  } else {
    fail("Home HTML does not ship demo-only sign-in copy (SSR)");
  }
} catch (e) {
  fail("Home HTML does not ship demo-only sign-in copy (SSR)", e instanceof Error ? e.message : String(e));
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n--- Summary: ${checks.length - failed.length} passed, ${failed.length} failed ---`);
if (failed.length) {
  process.exit(1);
}
console.log("\nProduction WorkOS auth flow checks passed.");
