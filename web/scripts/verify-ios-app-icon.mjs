/**
 * Verify iOS App Store icon before Archive upload.
 * Usage: pnpm --dir web run verify:ios-icon
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconPath = path.join(
  webRoot,
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
);
const contentsPath = path.join(webRoot, "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json");

let failed = false;

if (!fs.existsSync(iconPath)) {
  console.error("[verify:ios-icon] Missing:", iconPath);
  console.error("[verify:ios-icon] Run: pnpm --dir web run mobile:icons");
  process.exit(1);
}

const buf = fs.readFileSync(iconPath);
if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") {
  console.error("[verify:ios-icon] AppIcon is not a PNG");
  failed = true;
}

// PNG IHDR width/height at bytes 16–23 (big-endian)
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
if (w !== 1024 || h !== 1024) {
  console.error(`[verify:ios-icon] Expected 1024×1024, got ${w}×${h}`);
  failed = true;
}

// Color type byte 25: 2 = RGB (no alpha), 6 = RGBA
const colorType = buf[25];
if (colorType === 6 || colorType === 4) {
  console.error("[verify:ios-icon] Icon has alpha channel — App Store rejects transparent icons");
  failed = true;
}

const contents = JSON.parse(fs.readFileSync(contentsPath, "utf8"));
const entry = contents?.images?.find((img) => img.size === "1024x1024" && img.platform === "ios");
if (!entry?.filename) {
  console.error("[verify:ios-icon] Contents.json missing universal 1024×1024 iOS entry");
  failed = true;
}

if (failed) process.exit(1);

console.log("[verify:ios-icon] OK — 1024×1024 RGB PNG, AppIcon.appiconset configured");
console.log("[verify:ios-icon] Re-archive in Xcode after icon changes; ASC icon comes from the uploaded build.");
