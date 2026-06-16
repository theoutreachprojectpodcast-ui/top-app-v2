#!/usr/bin/env node
/**
 * Audit sponsor + trusted logo assets against logoPresentationCatalog.
 * Usage: node scripts/audit-logo-presentations.mjs [--base https://theoutreachproject.app]
 */
import sharp from "sharp";
import { LOGO_PRESENTATION_CATALOG } from "../src/lib/media/logoPresentationCatalog.js";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "https://theoutreachproject.app";

const ASSETS = {
  "apex-global-outdoors": "/sponsors/apex-global-outdoors-logo.png",
  "gameday-mens-health": "/sponsors/gameday-mens-health-wordmark.jpg",
  "rope-solutions": "/sponsors/rope-solutions-logo.png",
  "the-veterans-veteran": "/sponsors/the-veterans-veteran-logo.png",
  "iron-soldiers-coffee-company": "/sponsors/iron-soldiers-coffee-company-logo.png",
  "vetnav-services": "/sponsors/vetnav-services-logo.png",
  "eduardo-pico-designs":
    "https://eduardopicodesigns.com/cdn/shop/files/eduardo_pico_logo.png?v=1775735693&width=240",
  "green-gorilla-land-management": "/sponsors/green-gorilla-land-management-logo.png?v=2",
  "say-when-and-remember-him": "/trusted/say-when-and-remember-him-org-logo.png",
  "back-country-heroes": "/trusted/back-country-heroes-org-logo.png",
  "hero-to-the-line": "/trusted/hero-to-the-line-org-logo.png",
  "heros-journey-healing-foundation": "/trusted/heros-journey-healing-foundation-org-logo.png?v=1",
  "freedom-alliance": "/trusted/freedom-alliance-org-logo.png",
  "southern-outdoor-dreams": "/trusted/southern-outdoor-dreams-org-logo.png",
  "frontline-healing-foundation": "/trusted/frontline-healing-foundation-org-logo.png",
  "hometown-hero-outdoors": "/trusted/hometown-hero-outdoors-org-logo.png",
  "veterans-creed-outdoors": "/trusted/veterans-creed-outdoors-org-logo.png",
  "warriors-refuge": "/trusted/warriors-refuge-logo.png",
  "hoof-to-heart-veterans": "/trusted/hoof-to-heart-veterans-org-logo.png",
  "mos-veteran-adventures": "/trusted/mos-veteran-adventures-org-logo.png",
  "the-fallen-outdoors": "/trusted/the-fallen-outdoors-org-logo.png",
  "sheepdog-impact-assistance": "/trusted/sheepdog-impact-assistance-org-logo.png",
};

async function analyze(url) {
  const full = url.startsWith("http") ? url : `${BASE}${url}`;
  const res = await fetch(full);
  if (!res.ok) throw new Error(`${res.status} ${full}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let opaque = 0;
  let satSum = 0;
  let lumaSum = 0;
  let n = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const a = data[i + 3] / 255;
      if (a < 0.25) continue;
      opaque += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      satSum += sat;
      lumaSum += luma;
      n += 1;
    }
  }
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  return {
    fill: opaque / (width * height),
    aspect: boxW / boxH,
    avgSat: satSum / n,
    avgLuma: lumaSum / n,
  };
}

const slugs = Object.keys(ASSETS);
let missingCatalog = 0;
let failures = 0;

for (const slug of slugs) {
  if (!LOGO_PRESENTATION_CATALOG[slug]) {
    console.warn(`MISSING catalog row: ${slug}`);
    missingCatalog += 1;
  }
  try {
    const stats = await analyze(ASSETS[slug]);
    const row = LOGO_PRESENTATION_CATALOG[slug];
    console.log(
      `${slug.padEnd(34)} fill=${stats.fill.toFixed(2)} aspect=${stats.aspect.toFixed(2)} catalog=${row?.fit || "—"} pad=${row?.pad ?? "—"}`,
    );
  } catch (err) {
    console.error(`FAIL ${slug}: ${err.message}`);
    failures += 1;
  }
}

for (const slug of Object.keys(LOGO_PRESENTATION_CATALOG)) {
  if (!ASSETS[slug]) console.warn(`Catalog entry without audit asset: ${slug}`);
}

if (missingCatalog || failures) process.exit(1);
console.log(`\nOK — ${slugs.length} logos audited.`);
