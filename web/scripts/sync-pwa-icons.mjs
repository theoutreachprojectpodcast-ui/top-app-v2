/**
 * Ensures PWA / Add-to-Home-Screen icons are present for Next.js and static public paths.
 * Copies canonical PNGs from web/public into src/app/ (Next file-based metadata).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(webRoot, "public");
const appDir = path.join(webRoot, "src", "app");

const REQUIRED_PUBLIC = [
  "favicon-32x32.png",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "manifest.webmanifest",
];

const APP_COPIES = [
  ["icon-512.png", "icon.png"],
  ["apple-touch-icon.png", "apple-icon.png"],
];

/** Optional: high-res manifest entry for iPad / some Android launchers. */
const OPTIONAL_PUBLIC = ["icon-1024.png"];

function copyIfSourceExists(srcName, destPath) {
  const src = path.join(publicDir, srcName);
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(src, destPath);
  return true;
}

const missing = REQUIRED_PUBLIC.filter((name) => !fs.existsSync(path.join(publicDir, name)));
if (missing.length) {
  console.error("[sync-pwa-icons] Missing required public icons:", missing.join(", "));
  console.error("[sync-pwa-icons] Add tOP OP logo PNGs under web/public/ before deploy.");
  process.exit(1);
}

for (const [srcName, destName] of APP_COPIES) {
  const dest = path.join(appDir, destName);
  copyIfSourceExists(srcName, dest);
  console.log(`[sync-pwa-icons] ${srcName} -> src/app/${destName}`);
}

if (!fs.existsSync(path.join(publicDir, "icon-1024.png"))) {
  copyIfSourceExists("icon-512.png", path.join(publicDir, "icon-1024.png"));
  console.log("[sync-pwa-icons] icon-512.png -> public/icon-1024.png (manifest high-res fallback)");
}

for (const name of ["apple-touch-icon.png"]) {
  copyIfSourceExists(name, path.join(publicDir, "apple-touch-icon-precomposed.png"));
}

console.log("[sync-pwa-icons] PWA icon set ready.");
