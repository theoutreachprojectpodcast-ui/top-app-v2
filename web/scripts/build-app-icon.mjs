/**
 * Build production app icons: trim logo content, scale to 70% of canvas (15% padding per edge).
 *
 * Source: public/brand-app-icon-mark-source.png (auto-extracted from icon-1024 on first run)
 * Outputs: public/icon-*.png, resources/icon.png, src/app/icon.png, src/app/apple-icon.png
 *
 * Run: pnpm --dir web run build:app-icon
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(webRoot, "public");
const appDir = path.join(webRoot, "src", "app");
const resourcesDir = path.join(webRoot, "resources");

/** Logo occupies 70% of width/height → 15% padding on each edge. */
const CANVAS = 1024;
const LOGO_RATIO = 0.7;
const BG = { r: 0, g: 0, b: 0, alpha: 1 };

const MARK_SOURCE = path.join(publicDir, "brand-app-icon-mark-source.png");
/** Full-canvas master (small logo on black). Cropped once into MARK_SOURCE. */
const MASTER_SOURCE = path.join(publicDir, "brand-app-icon-master.png");
const LEGACY_SOURCE = path.join(publicDir, "icon-1024.png");

/** Pixels brighter than this (non-background) count as logo content. */
const CONTENT_LUM_THRESHOLD = 30;
const CONTENT_ALPHA_THRESHOLD = 20;

const OUTPUTS = [
  { name: "icon-1024.png", size: 1024 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32x32.png", size: 32 },
];

async function extractLogoBBox(imagePath) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < CONTENT_ALPHA_THRESHOLD || Math.max(r, g, b) <= CONTENT_LUM_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX <= minX || maxY <= minY) {
    throw new Error(`No logo content detected in ${imagePath}`);
  }

  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function ensureMarkSource() {
  if (fs.existsSync(MARK_SOURCE)) {
    const meta = await sharp(MARK_SOURCE).metadata();
    const canvas = Math.max(meta.width || 0, meta.height || 0);
    if (canvas > 0 && canvas < 900) return MARK_SOURCE;
    console.log("[build-app-icon] Regenerating mark source (previous extract was full canvas)");
  }

  const masterPath = fs.existsSync(MASTER_SOURCE)
    ? MASTER_SOURCE
    : fs.existsSync(LEGACY_SOURCE)
      ? LEGACY_SOURCE
      : null;
  if (!masterPath) {
    throw new Error(`Missing ${MASTER_SOURCE} or ${LEGACY_SOURCE} — add brand icon master first.`);
  }

  if (!fs.existsSync(MASTER_SOURCE) && masterPath === LEGACY_SOURCE) {
    fs.copyFileSync(LEGACY_SOURCE, MASTER_SOURCE);
    console.log("[build-app-icon] Saved master copy -> brand-app-icon-master.png");
  }

  const bbox = await extractLogoBBox(masterPath);
  const trimmed = await sharp(masterPath).extract(bbox).png().toBuffer();

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(MARK_SOURCE, trimmed);
  console.log(
    `[build-app-icon] Cropped mark -> brand-app-icon-mark-source.png (${bbox.width}x${bbox.height})`
  );
  return MARK_SOURCE;
}

async function composeIcon(markPath, size) {
  const maxLogo = Math.round(size * LOGO_RATIO);
  const logo = await sharp(markPath)
    .resize({ width: maxLogo, height: maxLogo, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  const markPath = await ensureMarkSource();
  const markMeta = await sharp(markPath).metadata();
  console.log(
    `[build-app-icon] Mark ${markMeta.width}x${markMeta.height} -> ${Math.round(LOGO_RATIO * 100)}% of ${CANVAS}px canvas`
  );

  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.mkdirSync(appDir, { recursive: true });

  for (const { name, size } of OUTPUTS) {
    const buf = await composeIcon(markPath, size);
    const dest = path.join(publicDir, name);
    fs.writeFileSync(dest, buf);
    console.log(`[build-app-icon] ${name} (${size}x${size})`);
  }

  const master = await composeIcon(markPath, CANVAS);
  fs.writeFileSync(path.join(resourcesDir, "icon.png"), master);
  fs.writeFileSync(path.join(appDir, "icon.png"), await composeIcon(markPath, 512));
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), await composeIcon(markPath, 180));
  fs.copyFileSync(path.join(publicDir, "apple-touch-icon.png"), path.join(publicDir, "apple-touch-icon-precomposed.png"));

  console.log("[build-app-icon] Done. Run: pnpm run mobile:icons && pnpm run mobile:assets");
}

main().catch((err) => {
  console.error("[build-app-icon]", err);
  process.exit(1);
});
