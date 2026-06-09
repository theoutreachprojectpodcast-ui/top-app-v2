/**
 * Generate branded native splash screens (iOS LaunchScreen asset + Android drawables).
 * Light brand canvas (#f5f7f6) with centered TOP mark — meets App Store / Play static splash requirements.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logoSource = path.join(webRoot, "public", "brand-logo-mark-light.png");
const fallbackLogo = path.join(webRoot, "public", "icon-1024.png");
const logoPath = fs.existsSync(logoSource) ? logoSource : fallbackLogo;

/** Matches --color-bg-app in brand-theme.css */
const SPLASH_BG = { r: 245, g: 247, b: 246, alpha: 1 };

const ANDROID_SPLASHES = [
  { dir: "drawable", width: 320, height: 480 },
  { dir: "drawable-port-mdpi", width: 320, height: 480 },
  { dir: "drawable-port-hdpi", width: 480, height: 800 },
  { dir: "drawable-port-xhdpi", width: 720, height: 1280 },
  { dir: "drawable-port-xxhdpi", width: 960, height: 1600 },
  { dir: "drawable-port-xxxhdpi", width: 1280, height: 1920 },
  { dir: "drawable-land-mdpi", width: 480, height: 320 },
  { dir: "drawable-land-hdpi", width: 800, height: 480 },
  { dir: "drawable-land-xhdpi", width: 1280, height: 720 },
  { dir: "drawable-land-xxhdpi", width: 1600, height: 960 },
  { dir: "drawable-land-xxxhdpi", width: 1920, height: 1280 },
];

const IOS_SPLASH_SIZE = 2732;

async function renderSplash(width, height, outFile) {
  const logoMax = Math.round(Math.min(width, height) * 0.38);
  const logo = await sharp(logoPath)
    .resize({ width: logoMax, height: logoMax, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: SPLASH_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outFile);
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error("[sync-native-splash] Missing logo source:", logoPath);
    process.exit(1);
  }

  const resRoot = path.join(webRoot, "android", "app", "src", "main", "res");
  for (const { dir, width, height } of ANDROID_SPLASHES) {
    const outDir = path.join(resRoot, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "splash.png");
    await renderSplash(width, height, outFile);
    console.log(`[sync-native-splash] ${dir}/splash.png (${width}×${height})`);
  }

  const iosDir = path.join(webRoot, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
  fs.mkdirSync(iosDir, { recursive: true });
  const iosFiles = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"];
  for (const name of iosFiles) {
    const outFile = path.join(iosDir, name);
    await renderSplash(IOS_SPLASH_SIZE, IOS_SPLASH_SIZE, outFile);
    console.log(`[sync-native-splash] iOS ${name}`);
  }

  const resourcesDir = path.join(webRoot, "resources");
  fs.mkdirSync(resourcesDir, { recursive: true });
  await renderSplash(2732, 2732, path.join(resourcesDir, "splash.png"));
  console.log("[sync-native-splash] resources/splash.png");
}

main().catch((err) => {
  console.error("[sync-native-splash]", err);
  process.exit(1);
});
