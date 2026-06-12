/**
 * Fail store-prep builds when embedded Capacitor server.url is missing or dev-only.
 *
 * Usage:
 *   node scripts/verify-capacitor-server-url.mjs
 *   CAP_SERVER_URL=https://theoutreachproject.app CAP_SERVER_PROFILE=production node scripts/verify-capacitor-server-url.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const urls = JSON.parse(fs.readFileSync(path.join(webRoot, "capacitor.server-urls.json"), "utf8"));

const profile = String(process.env.CAP_SERVER_PROFILE || "production").trim().toLowerCase();
const expected = String(
  process.env.CAP_SERVER_URL ||
    (profile === "qa" ? urls.qa : urls.production),
)
  .trim()
  .replace(/\/$/, "");

const devMarkers = ["localhost", "127.0.0.1", "10.0.2.2", "192.168.", "0.0.0.0"];
const configPaths = [
  ["iOS", path.join(webRoot, "ios/App/App/capacitor.config.json")],
  ["Android", path.join(webRoot, "android/app/src/main/assets/capacitor.config.json")],
];

let ok = true;

for (const [label, filePath] of configPaths) {
  if (!fs.existsSync(filePath)) {
    console.error(`[verify-cap-server] Missing ${label} config: ${path.relative(webRoot, filePath)} (run cap sync)`);
    ok = false;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    console.error(`[verify-cap-server] Invalid JSON: ${path.relative(webRoot, filePath)}`);
    ok = false;
    continue;
  }

  const url = String(parsed?.server?.url || "").trim().replace(/\/$/, "");
  if (!url) {
    console.error(`[verify-cap-server] ${label} missing server.url — TestFlight will not load production`);
    ok = false;
    continue;
  }

  if (!url.startsWith("https://")) {
    console.error(`[verify-cap-server] ${label} server.url must be HTTPS for store builds: ${url}`);
    ok = false;
    continue;
  }

  if (devMarkers.some((marker) => url.toLowerCase().includes(marker))) {
    console.error(`[verify-cap-server] ${label} has dev-only server.url: ${url}`);
    ok = false;
    continue;
  }

  if (url !== expected) {
    console.error(`[verify-cap-server] ${label} expected ${expected}, got ${url}`);
    ok = false;
    continue;
  }

  console.log(`[verify-cap-server] OK ${label} -> ${url}`);
}

if (!ok) {
  console.error(
    "[verify-cap-server] Fix: pnpm --dir web run mobile:prep:prod  (then re-archive in Xcode)",
  );
  process.exit(1);
}

console.log(`[verify-cap-server] Embedded server.url matches ${profile} profile (${expected})`);
