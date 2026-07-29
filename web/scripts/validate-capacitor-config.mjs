/**
 * CI-friendly Capacitor structure check (no Xcode/Android Studio required).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "capacitor.config.js",
  "capacitor-www/index.html",
  "ios/App/App.xcodeproj/project.pbxproj",
  "android/app/src/main/AndroidManifest.xml",
  "src/lib/capacitor/platform.js",
];

const missing = required.filter((rel) => !fs.existsSync(path.join(webRoot, rel)));
if (missing.length) {
  console.error("[validate-capacitor] Missing:", missing.join(", "));
  process.exit(1);
}

const configSrc = fs.readFileSync(path.join(webRoot, "capacitor.config.js"), "utf8");
if (!/appId:\s*["']com\.theoutreachproject\.theoutreachproject["']/.test(configSrc)) {
  console.error("[validate-capacitor] Unexpected or missing appId in capacitor.config.js");
  process.exit(1);
}
if (!/webDir:\s*["']capacitor-www["']/.test(configSrc)) {
  console.error("[validate-capacitor] Unexpected or missing webDir in capacitor.config.js");
  process.exit(1);
}
if (!/minWebViewVersion:\s*111\b/.test(configSrc)) {
  console.error("[validate-capacitor] Android minWebViewVersion must match Next.js 16 support (111+)");
  process.exit(1);
}

// Portrait lock is required for all store builds — delegated to dedicated validator.
const portrait = spawnSync(process.execPath, [path.join(webRoot, "scripts/validate-portrait-orientation.mjs")], {
  cwd: webRoot,
  stdio: "inherit",
});
if (portrait.status !== 0) {
  process.exit(portrait.status ?? 1);
}

console.log(
  "[validate-capacitor] OK — appId=com.theoutreachproject.theoutreachproject webDir=capacitor-www Android WebView=111+",
);
if (/server:\s*\{/.test(configSrc) && process.env.CAP_SERVER_URL) {
  console.log("[validate-capacitor] CAP_SERVER_URL=%s (set at sync time)", process.env.CAP_SERVER_URL);
} else {
  console.log("[validate-capacitor] Run cap sync with CAP_SERVER_URL for production WebView URL embedding");
}
