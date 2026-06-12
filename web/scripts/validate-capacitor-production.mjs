/**
 * Verify Capacitor native projects embed the production WebView URL.
 * Run after: CAP_SERVER_URL=https://theoutreachproject.app pnpm exec cap sync
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_ORIGIN = String(
  process.env.CAP_SERVER_URL || process.env.MOBILE_PRODUCTION_URL || "https://theoutreachproject.app",
)
  .trim()
  .replace(/\/$/, "");

const PRODUCTION_SERVER_URL = PRODUCTION_ORIGIN.replace(/\/mobile\/?$/, "");

const FORBIDDEN = [/localhost/i, /127\.0\.0\.0\.1/, /qa\.theoutreachproject/i, /10\.0\.2\.2/];

const embeddedPaths = [
  "ios/App/App/capacitor.config.json",
  "android/app/src/main/assets/capacitor.config.json",
];

function readJson(rel) {
  const abs = path.join(webRoot, rel);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

let failed = false;

for (const rel of embeddedPaths) {
  const cfg = readJson(rel);
  if (!cfg) {
    console.warn(`[mobile:verify:prod] Skip missing ${rel} (run cap sync ios/android)`);
    continue;
  }
  const url = String(cfg?.server?.url || "").trim().replace(/\/$/, "");
  if (url !== PRODUCTION_SERVER_URL) {
    console.error(`[mobile:verify:prod] ${rel}: server.url=${url || "(unset)"} expected ${PRODUCTION_SERVER_URL}`);
    failed = true;
    continue;
  }
  const nav = Array.isArray(cfg?.server?.allowNavigation) ? cfg.server.allowNavigation : [];
  for (const entry of nav) {
    if (FORBIDDEN.some((re) => re.test(String(entry)))) {
      console.error(`[mobile:verify:prod] ${rel}: forbidden allowNavigation entry: ${entry}`);
      failed = true;
    }
  }
  if (cfg?.server?.cleartext === true) {
    console.error(`[mobile:verify:prod] ${rel}: cleartext must be false for production`);
    failed = true;
  }
  console.log(`[mobile:verify:prod] OK ${rel} → ${url}`);
}

if (failed) {
  console.error(
    `[mobile:verify:prod] Fix: CAP_SERVER_URL=${PRODUCTION_ORIGIN} pnpm exec cap sync ios android`,
  );
  process.exit(1);
}

/** Optional live production sanity (no secrets). */
const checkLive = process.env.MOBILE_VERIFY_SKIP_HTTP !== "1";
if (checkLive && typeof fetch === "function") {
  try {
    const res = await fetch(`${PRODUCTION_ORIGIN}/api/auth/status`, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[mobile:verify:prod] Production /api/auth/status HTTP ${res.status}`);
    } else {
      const body = await res.json();
      if (body.demoFlowsEnabled) {
        console.warn("[mobile:verify:prod] Production has demoFlowsEnabled:true — unexpected for store build");
      } else {
        console.log("[mobile:verify:prod] Production auth OK (demoFlowsEnabled:false)");
      }
    }
  } catch (err) {
    console.warn("[mobile:verify:prod] Could not reach production (offline?):", err?.message || err);
  }
}

console.log(`[mobile:verify:prod] Native shells target ${PRODUCTION_SERVER_URL}`);
console.log(
  "[mobile:verify:prod] Web UI updates require Vercel production deploy — the WebView loads live production, not local web/.",
);
