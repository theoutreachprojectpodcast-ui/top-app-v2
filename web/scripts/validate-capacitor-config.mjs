/**
 * CI-friendly Capacitor structure check (no Xcode/Android Studio required).
 */
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
if (!/appId:\s*["']org\.theoutreachproject\.torp["']/.test(configSrc)) {
  console.error("[validate-capacitor] Unexpected or missing appId in capacitor.config.js");
  process.exit(1);
}
if (!/webDir:\s*["']capacitor-www["']/.test(configSrc)) {
  console.error("[validate-capacitor] Unexpected or missing webDir in capacitor.config.js");
  process.exit(1);
}

console.log("[validate-capacitor] OK — appId=org.theoutreachproject.torp webDir=capacitor-www");
if (/server:\s*\{/.test(configSrc) && process.env.CAP_SERVER_URL) {
  console.log("[validate-capacitor] CAP_SERVER_URL=%s (set at sync time)", process.env.CAP_SERVER_URL);
} else {
  console.log("[validate-capacitor] Run cap sync with CAP_SERVER_URL for production WebView URL embedding");
}
