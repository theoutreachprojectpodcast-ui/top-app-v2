/**
 * Generate native splash screens: full-bleed hero background + optional centered mark.
 *
 * Source background: public/mobile/splash-background.png
 * Run: pnpm --dir web run mobile:splash
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const backgroundSource = path.join(webRoot, "public", "mobile", "splash-background.png");

const ANDROID_SPLASHES = [
  { dir: "drawable", width: 320, height: 480 },
  { dir: "drawable-night", width: 320, height: 480 },
  { dir: "drawable-port-ldpi", width: 240, height: 320 },
  { dir: "drawable-port-night-ldpi", width: 240, height: 320 },
  { dir: "drawable-port-mdpi", width: 320, height: 480 },
  { dir: "drawable-port-night-mdpi", width: 320, height: 480 },
  { dir: "drawable-port-hdpi", width: 480, height: 800 },
  { dir: "drawable-port-night-hdpi", width: 480, height: 800 },
  { dir: "drawable-port-xhdpi", width: 720, height: 1280 },
  { dir: "drawable-port-night-xhdpi", width: 720, height: 1280 },
  { dir: "drawable-port-xxhdpi", width: 960, height: 1600 },
  { dir: "drawable-port-night-xxhdpi", width: 960, height: 1600 },
  { dir: "drawable-port-xxxhdpi", width: 1280, height: 1920 },
  { dir: "drawable-port-night-xxxhdpi", width: 1280, height: 1920 },
  { dir: "drawable-land-ldpi", width: 320, height: 240 },
  { dir: "drawable-land-night-ldpi", width: 320, height: 240 },
  { dir: "drawable-land-mdpi", width: 480, height: 320 },
  { dir: "drawable-land-night-mdpi", width: 480, height: 320 },
  { dir: "drawable-land-hdpi", width: 800, height: 480 },
  { dir: "drawable-land-night-hdpi", width: 800, height: 480 },
  { dir: "drawable-land-xhdpi", width: 1280, height: 720 },
  { dir: "drawable-land-night-xhdpi", width: 1280, height: 720 },
  { dir: "drawable-land-xxhdpi", width: 1600, height: 960 },
  { dir: "drawable-land-night-xxhdpi", width: 1600, height: 960 },
  { dir: "drawable-land-xxxhdpi", width: 1920, height: 1280 },
  { dir: "drawable-land-night-xxxhdpi", width: 1920, height: 1280 },
];

const IOS_SPLASH_SIZE = 2732;

async function renderSplash(width, height) {
  return sharp(backgroundSource)
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(backgroundSource)) {
    console.error("[sync-native-splash] Missing background:", backgroundSource);
    process.exit(1);
  }

  const resRoot = path.join(webRoot, "android", "app", "src", "main", "res");
  for (const { dir, width, height } of ANDROID_SPLASHES) {
    const outDir = path.join(resRoot, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "splash.png");
    const buf = await renderSplash(width, height);
    fs.writeFileSync(outFile, buf);
    console.log(`[sync-native-splash] ${dir}/splash.png (${width}x${height})`);
  }

  const iosDir = path.join(webRoot, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
  fs.mkdirSync(iosDir, { recursive: true });

  const iosMaster = await renderSplash(IOS_SPLASH_SIZE, IOS_SPLASH_SIZE);
  const iosNames = [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
    "Default@1x~universal~anyany.png",
    "Default@2x~universal~anyany.png",
    "Default@3x~universal~anyany.png",
    "Default@1x~universal~anyany-dark.png",
    "Default@2x~universal~anyany-dark.png",
    "Default@3x~universal~anyany-dark.png",
  ];
  for (const name of iosNames) {
    fs.writeFileSync(path.join(iosDir, name), iosMaster);
    console.log(`[sync-native-splash] iOS ${name}`);
  }

  const resourcesDir = path.join(webRoot, "resources");
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.writeFileSync(path.join(resourcesDir, "splash.png"), iosMaster);
  console.log("[sync-native-splash] resources/splash.png");
}

main().catch((err) => {
  console.error("[sync-native-splash]", err);
  process.exit(1);
});
