/**
 * Sync brand icon into iOS App Store asset slot (1024×1024).
 * Android adaptive icons: `pnpm run mobile:assets` (from resources/icon.png).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const build = spawnSync(process.execPath, ["scripts/build-app-icon.mjs"], {
  cwd: webRoot,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const source = path.join(webRoot, "public", "icon-1024.png");
const iosDest = path.join(
  webRoot,
  "ios",
  "App",
  "App",
  "Assets.xcassets",
  "AppIcon.appiconset",
  "AppIcon-512@2x.png"
);

if (!fs.existsSync(source)) {
  console.error("[sync-native-icons] Missing public/icon-1024.png — run prebuild or add brand icon.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(iosDest), { recursive: true });
fs.copyFileSync(source, iosDest);
console.log("[sync-native-icons] icon-1024.png -> iOS AppIcon-512@2x.png");
console.log("[sync-native-icons] For Android mipmaps run: pnpm run mobile:assets (requires sharp)");
console.log("[sync-native-icons] Or Android Studio → app → New → Image Asset → Launcher Icons");
