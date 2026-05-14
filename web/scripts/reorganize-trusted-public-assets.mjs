/**
 * One-off maintenance: former "header" PNGs were org marks/logos — rename to *-org-logo.png
 * and write complementary wide *-hero.svg strips for listing cards.
 *
 * Run from repo: node web/scripts/reorganize-trusted-public-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/trusted");

const HEADER_TO_LOGO = [
  "say-when-and-remember-him",
  "back-country-heroes",
  "hero-to-the-line",
  "heros-journey-healing-foundation",
  "freedom-alliance",
  "southern-outdoor-dreams",
  "frontline-healing-foundation",
  "hometown-hero-outdoors",
  "veterans-creed-outdoors",
  "hoof-to-heart-veterans",
  "mos-veteran-adventures",
  "the-fallen-outdoors",
  "sheepdog-impact-assistance",
];

const ALL_HERO_SLUGS = [...HEADER_TO_LOGO, "warriors-refuge"];

function hashHue(slug) {
  const h = crypto.createHash("sha256").update(slug).digest();
  return (h[0] * 3 + h[1] * 5 + h[2] * 7) % 360;
}

function heroSvg(slug) {
  const hue = hashHue(slug);
  const a = `hsl(${hue} 44% 20%)`;
  const b = `hsl(${(hue + 48) % 360} 40% 30%)`;
  const c = `hsl(${(hue + 200) % 360} 36% 16%)`;
  const glow = `hsl(${(hue + 110) % 360} 58% 52%)`;
  const wave = `hsl(${hue} 28% 10%)`;
  const id = `trh-${slug.replace(/[^a-z0-9-]/gi, "")}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="${id}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="52%" stop-color="${b}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="20%" cy="25%" r="0.95">
      <stop offset="0%" stop-color="${glow}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <linearGradient id="${id}-veil" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.06)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.48)"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="380" fill="url(#${id}-bg)"/>
  <rect width="1200" height="380" fill="url(#${id}-glow)"/>
  <path d="M0 268 C220 228 380 308 600 258 C820 208 980 248 1200 218 L1200 380 L0 380 Z" fill="${wave}" opacity="0.22"/>
  <rect width="1200" height="380" fill="url(#${id}-veil)"/>
</svg>`;
}

for (const slug of HEADER_TO_LOGO) {
  const from = path.join(dir, `${slug}-header.png`);
  const to = path.join(dir, `${slug}-org-logo.png`);
  if (!fs.existsSync(from)) {
    console.warn(`skip rename (missing): ${from}`);
    continue;
  }
  if (fs.existsSync(to)) {
    console.warn(`skip rename (target exists): ${to}`);
    continue;
  }
  fs.renameSync(from, to);
  console.log(`renamed ${slug}-header.png → ${slug}-org-logo.png`);
}

for (const slug of ALL_HERO_SLUGS) {
  const out = path.join(dir, `${slug}-hero.svg`);
  fs.writeFileSync(out, heroSvg(slug), "utf8");
  console.log(`wrote ${slug}-hero.svg`);
}

console.log("done");
