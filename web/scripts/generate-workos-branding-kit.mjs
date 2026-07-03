/**
 * Build WorkOS AuthKit branding kit assets (≤ 100 KB each per WorkOS limits).
 * Output: web/docs/workos-branding-kit/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const kitRoot = path.join(webRoot, "docs", "workos-branding-kit");
const assetsDir = path.join(kitRoot, "assets");
const publicDir = path.join(webRoot, "public");

const MAX_BYTES = 100 * 1024;

const SOURCES = {
  logo: path.join(publicDir, "brand-logo-site-dark.png"),
  logoIcon: path.join(publicDir, "brand-logo-mark-dark.png"),
  favicon: path.join(publicDir, "apple-touch-icon.png"),
};

/** @param {Buffer} buf */
function byteSize(buf) {
  return buf.length;
}

/**
 * Compress PNG under WorkOS 100 KB cap by stepping down width/quality.
 * @param {sharp.Sharp} pipeline
 * @param {{ maxWidth?: number, maxHeight?: number, square?: number }} opts
 */
async function toWorkosPng(pipeline, { maxWidth, maxHeight, square } = {}) {
  let width = square || maxWidth || 512;
  const minWidth = square ? 160 : 160;
  const qualities = [90, 82, 74, 66, 58, 50, 42];

  while (width >= minWidth) {
    for (const quality of qualities) {
      let img = pipeline.clone();
      if (square) {
        img = img.resize(square, square, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
      } else if (maxWidth) {
        img = img.resize({ width: maxWidth, withoutEnlargement: true });
      } else if (maxHeight) {
        img = img.resize({ height: maxHeight, withoutEnlargement: true });
      }
      const buf = await img.png({ compressionLevel: 9, quality, palette: true }).toBuffer();
      if (byteSize(buf) <= MAX_BYTES) return buf;
    }
    width = square ? Math.floor(width * 0.85) : Math.floor((maxWidth || width) * 0.85);
    if (square) square = width;
    else if (maxWidth) maxWidth = width;
  }
  throw new Error("Could not compress image under 100 KB");
}

async function writeAsset(name, buf, meta) {
  const outPath = path.join(assetsDir, name);
  await fs.promises.writeFile(outPath, buf);
  const info = await sharp(buf).metadata();
  return {
    file: `assets/${name}`,
    bytes: byteSize(buf),
    width: info.width,
    height: info.height,
    ...meta,
  };
}

async function main() {
  fs.mkdirSync(assetsDir, { recursive: true });

  const logoBuf = await toWorkosPng(sharp(SOURCES.logo), { maxWidth: 640 });
  const logoIconBuf = await toWorkosPng(sharp(SOURCES.logoIcon), { square: 512 });
  const faviconBuf = await toWorkosPng(sharp(SOURCES.favicon), { square: 180 });

  const assets = {
    logo: await writeAsset("logo.png", logoBuf, {
      workosRole: "Logo",
      source: "web/public/brand-logo-site-dark.png",
      formats: "PNG",
      notes: "Full wordmark for AuthKit header",
    }),
    logoIcon: await writeAsset("logo-icon.png", logoIconBuf, {
      workosRole: "Logo icon",
      source: "web/public/brand-logo-mark-dark.png",
      formats: "PNG",
      aspectRatio: "1:1",
      notes: "Square logomark; select in AuthKit preview for mobile-friendly header",
    }),
    favicon: await writeAsset("favicon.png", faviconBuf, {
      workosRole: "Favicon",
      source: "web/public/apple-touch-icon.png",
      formats: "PNG",
      aspectRatio: "1:1",
      notes: "Browser tab icon",
    }),
  };

  for (const entry of Object.values(assets)) {
    if (entry.bytes > MAX_BYTES) {
      throw new Error(`${entry.file} is ${entry.bytes} bytes (max ${MAX_BYTES})`);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    workosDocs: "https://workos.com/docs/authkit/branding",
    dashboardPath: "Authentication → Branding (or AuthKit → Branding)",
    maxAssetBytes: MAX_BYTES,
    assets,
    appearance: {
      fontFamily: "Roboto",
      cornerRadiusPx: 16,
      mode: "System default",
    },
    colors: {
      light: {
        pageBackground: "#e8ece8",
        buttonBackground: "#22a52b",
        buttonText: "#ffffff",
        link: "#188a20",
      },
      dark: {
        pageBackground: "#101814",
        buttonBackground: "#22a52b",
        buttonText: "#ffffff",
        link: "#9fd4b0",
      },
    },
    pageSettings: {
      privacyPolicyUrl: "https://theoutreachproject.app/privacy",
      termsOfServiceUrl: "https://theoutreachproject.app/terms",
      signInTitle: "Sign in to The Outreach Project",
      signUpTitle: "Create your Outreach Project account",
    },
    files: {
      customCss: "custom.css",
      splitPanelHtml: "split-panel.html",
      splitPanelCss: "split-panel.css",
    },
  };

  await fs.promises.writeFile(
    path.join(kitRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log("WorkOS branding kit written to:", kitRoot);
  for (const entry of Object.values(assets)) {
    console.log(`  ${entry.file}: ${entry.width}×${entry.height}, ${(entry.bytes / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
