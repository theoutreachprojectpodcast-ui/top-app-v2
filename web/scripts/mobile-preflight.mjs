/**
 * Production mobile auth + Capacitor preflight.
 * Usage: pnpm --dir web run mobile:preflight
 *        MOBILE_PREFLIGHT_ORIGIN=https://theoutreachproject.app pnpm --dir web run mobile:preflight
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = String(
  process.env.MOBILE_PREFLIGHT_ORIGIN ||
    process.env.CAP_SERVER_URL ||
    process.env.MOBILE_PRODUCTION_URL ||
    "https://theoutreachproject.app",
)
  .trim()
  .replace(/\/$/, "");

const expectedServerUrl = origin.replace(/\/mobile\/?$/, "");
const expectedBundleId = "com.theoutreachproject.theoutreachproject";
const forbidden = [/localhost/i, /127\.0\.0\.1/, /10\.0\.2\.2/, /qa\.theoutreachproject/i];

let failed = false;

function fail(msg) {
  console.error(`[mobile:preflight] FAIL ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[mobile:preflight] OK ${msg}`);
}

function readJson(rel) {
  const abs = path.join(webRoot, rel);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

// --- Capacitor embedded config ---
for (const rel of ["ios/App/App/capacitor.config.json", "android/app/src/main/assets/capacitor.config.json"]) {
  const cfg = readJson(rel);
  if (!cfg) {
    console.warn(`[mobile:preflight] SKIP missing ${rel} (run cap sync)`);
    continue;
  }
  if (cfg.appId !== expectedBundleId) {
    fail(`${rel} appId=${cfg.appId} expected ${expectedBundleId}`);
  } else {
    ok(`${rel} appId`);
  }
  const url = String(cfg?.server?.url || "").replace(/\/$/, "");
  if (url !== expectedServerUrl) {
    fail(`${rel} server.url=${url || "(unset)"} expected ${expectedServerUrl}`);
  } else {
    ok(`${rel} server.url → ${url}`);
  }
  const blob = JSON.stringify(cfg);
  for (const re of forbidden) {
    if (re.test(blob)) fail(`${rel} contains forbidden host pattern ${re}`);
  }
  if (cfg?.server?.cleartext === true) fail(`${rel} cleartext must be false for production`);
  if (!cfg?.server?.errorPath) fail(`${rel} server.errorPath must be set (offline recovery)`);
  else ok(`${rel} server.errorPath`);
}

// --- capacitor.config.js source ---
const capJs = fs.readFileSync(path.join(webRoot, "capacitor.config.js"), "utf8");
if (!capJs.includes(`appId: "com.theoutreachproject.theoutreachproject"`)) {
  fail("capacitor.config.js missing expected appId");
} else {
  ok("capacitor.config.js appId");
}

// --- iOS associated domains (production only in App Store / TestFlight builds) ---
const entitlements = fs.readFileSync(path.join(webRoot, "ios/App/App/App.entitlements"), "utf8");
if (entitlements.includes("qa.theoutreachproject.app")) {
  fail("App.entitlements must not include qa.theoutreachproject.app for production builds");
} else {
  ok("App.entitlements production applinks only");
}

// --- iOS URL schemes ---
const infoPlist = fs.readFileSync(path.join(webRoot, "ios/App/App/Info.plist"), "utf8");
if (!infoPlist.includes(`<string>${expectedBundleId}</string>`)) {
  fail("Info.plist missing custom URL scheme for bundle id");
} else {
  ok("Info.plist URL scheme");
}

// --- Auth routes exist in source ---
const requiredRoutes = [
  "src/app/auth/workos-go/route.js",
  "src/app/auth/workos-browser-start/route.js",
  "src/app/callback/route.js",
  "src/app/api/mobile/oauth-handoff/route.js",
  "src/lib/auth/workosNativeAuthLaunch.js",
];
for (const rel of requiredRoutes) {
  if (!fs.existsSync(path.join(webRoot, rel))) fail(`missing ${rel}`);
  else ok(`route file ${rel}`);
}

// --- Sign-in resolver must accept request param (regression guard) ---
const signInSrc = fs.readFileSync(path.join(webRoot, "src/lib/auth/workosSignInUrl.js"), "utf8");
if (
  signInSrc.includes("shouldMarkOAuthNativeShell(searchParams, request)") &&
  !/resolveWorkOSSignInFromSearchParams\(searchParams,\s*fallbackReturn\s*=\s*"\/",\s*request\)/.test(signInSrc)
) {
  fail("workosSignInUrl.js: uses request without declaring parameter");
} else {
  ok("workosSignInUrl.js request parameter");
}

// --- Android App Links must cover AASA oauth return paths ---
const ANDROID_APP_LINK_PATHS = [
  "/callback",
  "/mobile/auth/complete",
  "/api/mobile/oauth-handoff/complete",
  "/api/mobile/oauth-handoff/bridge",
  "/mobile-auth",
];
const manifestXml = fs.readFileSync(
  path.join(webRoot, "android/app/src/main/AndroidManifest.xml"),
  "utf8",
);
for (const prefix of ANDROID_APP_LINK_PATHS) {
  if (!manifestXml.includes(`android:pathPrefix="${prefix}"`)) {
    fail(`AndroidManifest missing App Link pathPrefix ${prefix}`);
  } else {
    ok(`AndroidManifest App Link ${prefix}`);
  }
}

// --- AASA paths must include oauth handoff complete ---
const aasaRoute = fs.readFileSync(
  path.join(webRoot, "src/app/.well-known/apple-app-site-association/route.js"),
  "utf8",
);
for (const aasaPath of ["/api/mobile/oauth-handoff/complete", "/mobile/auth/complete", "/callback"]) {
  if (!aasaRoute.includes(`"${aasaPath}"`)) {
    fail(`AASA route missing path ${aasaPath}`);
  } else {
    ok(`AASA path ${aasaPath}`);
  }
}

// --- Post-login funnel helper must exist ---
if (!fs.existsSync(path.join(webRoot, "src/lib/capacitor/mobilePostLoginReturn.js"))) {
  fail("missing mobilePostLoginReturn.js");
} else {
  ok("mobilePostLoginReturn.js");
}

// --- Live production auth endpoints ---
if (typeof fetch === "function" && process.env.MOBILE_PREFLIGHT_SKIP_HTTP !== "1") {
  try {
    const statusRes = await fetch(`${origin}/api/auth/status`, { cache: "no-store" });
    if (!statusRes.ok) fail(`/api/auth/status HTTP ${statusRes.status}`);
    else {
      const status = await statusRes.json();
      if (!status.workos) fail("/api/auth/status workos:false");
      else ok("/api/auth/status workos configured");
    }

    const goRes = await fetch(
      `${origin}/auth/workos-go?mode=signin&returnTo=%2F&format=json&native=1`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "TheOutreachProject/Capacitor MobilePreflight/1.0",
        },
      },
    );
    const goBody = await goRes.json().catch(() => ({}));
    if (!goRes.ok || !goBody?.ok || !goBody?.url) {
      fail(
        `/auth/workos-go JSON HTTP ${goRes.status} — ${goBody?.message || "no authorize url"} (blocks all mobile login)`,
      );
    } else if (!String(goBody.url).startsWith("https://")) {
      fail(`/auth/workos-go returned non-https url`);
    } else {
      ok("/auth/workos-go returns WorkOS authorize URL");
    }

    const healthRes = await fetch(`${origin}/api/mobile/auth-health`, { cache: "no-store" });
    if (healthRes.ok) {
      const health = await healthRes.json();
      if (!health.ok) fail(`/api/mobile/auth-health ${JSON.stringify(health.checks || {})}`);
      else ok("/api/mobile/auth-health");
    }
  } catch (err) {
    fail(`HTTP checks: ${err?.message || err}`);
  }
}

if (failed) {
  console.error("\n[mobile:preflight] Fix issues before TestFlight / App Store upload.");
  process.exit(1);
}

console.log("\n[mobile:preflight] All checks passed.");
console.log(`[mobile:preflight] Native WebView entry: ${expectedServerUrl}`);
console.log(`[mobile:preflight] WorkOS callback (dashboard): ${origin}/callback`);
