/**
 * Export App Store–sized store screenshots (SVG + PNG) of main TORP surfaces.
 * Portrait output: 1284 × 2778 px (Apple 6.7" display spec).
 * Does not modify application code — only drives a browser and writes files under docs/store-screenshots/svg/.
 *
 * Usage:
 *   pnpm --dir web run export:store-screenshots
 *   SCREENSHOT_PROFILE=ipad-13 SCREENSHOT_ONLY=01-home pnpm --dir web run export:store-screenshots
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");

const BASE_URL = String(process.env.SCREENSHOT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Apple App Store display profiles (portrait). */
const SCREENSHOT_PROFILES = {
  /** 6.7" iPhone — also accepts 1242×2688 for 6.5". */
  "iphone-67": { width: 1284, height: 2778, scale: 3, outSubdir: "svg" },
  /** 13" iPad Pro (M4) — App Store Connect "iPad Pro 13-inch" slot. */
  "ipad-13": { width: 2064, height: 2752, scale: 2, outSubdir: "ipad-13" },
};

const PROFILE_KEY = String(process.env.SCREENSHOT_PROFILE || "iphone-67").trim();
const PROFILE = SCREENSHOT_PROFILES[PROFILE_KEY];
if (!PROFILE) {
  throw new Error(
    `Unknown SCREENSHOT_PROFILE "${PROFILE_KEY}". Use: ${Object.keys(SCREENSHOT_PROFILES).join(", ")}`,
  );
}

const OUT_DIR = path.join(REPO_ROOT, "docs", "store-screenshots", PROFILE.outSubdir);

const OUTPUT_WIDTH = PROFILE.width;
const OUTPUT_HEIGHT = PROFILE.height;
const DEVICE_SCALE = PROFILE.scale;
const VIEWPORT = {
  width: OUTPUT_WIDTH / DEVICE_SCALE,
  height: OUTPUT_HEIGHT / DEVICE_SCALE,
};

const ONLY_CAPTURE = String(process.env.SCREENSHOT_ONLY || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const GENERIC_USER = {
  firstName: "Alex",
  lastName: "Rivera",
  email: "supporter@example.com",
  password: "screenshot1",
};

/** Known registry EINs — directory/trusted cards resolve when Supabase is configured. */
const SAVED_EINS = ["923487010", "883575938", "412739043"];

const SHOWCASE_CSS = `
  .homeMembershipSection,
  .homeMembershipBar,
  .homeAuthCards,
  .profileCompletionPanel,
  .membershipBillingCenter,
  .profileDemoResetNote,
  .homeMembershipSection__header { display: none !important; }

  .modalOverlay,
  .modalCard { display: none !important; }

  [class*="demoAuthModal"] { display: none !important; }
`;

const HIDE_DEMO_RESET_CSS = `
  .profileDemoResetNote { display: none !important; }
`;

function buildSeedScript() {
  const profile = {
    firstName: GENERIC_USER.firstName,
    lastName: GENERIC_USER.lastName,
    name: `${GENERIC_USER.firstName} ${GENERIC_USER.lastName}`,
    email: GENERIC_USER.email,
    tier: "access",
    membershipTier: "access",
    membershipStatus: "active",
    membershipBillingStatus: "active",
    theme: "clean",
    colorScheme: "light",
    banner: "Veteran advocate exploring trusted nonprofits in the TOP network.",
    photoDataUrl: "",
    identityRole: "Veteran",
    missionStatement: "Connect peers with vetted resources.",
    city: "Denver",
    state: "CO",
  };

  return `
    try {
      localStorage.setItem("top_auth_v1", ${JSON.stringify(JSON.stringify({ isAuthenticated: true, provider: "demo_email" }))});
      localStorage.setItem("top_demo_account_v1", ${JSON.stringify(
        JSON.stringify({ email: GENERIC_USER.email, password: GENERIC_USER.password }),
      )});
      localStorage.setItem("top_profile_v3", ${JSON.stringify(JSON.stringify(profile))});
      localStorage.setItem("top_favorites_v3", ${JSON.stringify(JSON.stringify(SAVED_EINS))});
      sessionStorage.setItem("top_nav_auth_v1", ${JSON.stringify(
        JSON.stringify({ authenticated: true, workos: false, hasFreeAccess: true, t: Date.now() }),
      )});
      document.documentElement.setAttribute("data-color-scheme", "light");
      document.documentElement.classList.remove("dark");
    } catch (e) {
      console.warn("[export-store-screenshots] seed failed", e);
    }
  `;
}

async function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await ping(url)) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Server not reachable at ${url}`);
}

async function maybeStartDevServer() {
  if (await ping(BASE_URL)) {
    console.log(`[export-store-screenshots] Using existing server at ${BASE_URL}`);
    return null;
  }

  console.log(`[export-store-screenshots] Starting dev server for ${BASE_URL}…`);
  const child = spawn("pnpm", ["run", "dev"], {
    cwd: WEB_ROOT,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  await waitForServer(BASE_URL);
  return child;
}

function readPngDimensions(pngBuffer) {
  if (pngBuffer.length < 24 || pngBuffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error("Invalid PNG buffer");
  }
  return { width: pngBuffer.readUInt32BE(16), height: pngBuffer.readUInt32BE(20) };
}

async function writeOutputs(pngBuffer, basePath) {
  const { width, height } = readPngDimensions(pngBuffer);
  if (width !== OUTPUT_WIDTH || height !== OUTPUT_HEIGHT) {
    throw new Error(`Expected ${OUTPUT_WIDTH}×${OUTPUT_HEIGHT}, got ${width}×${height}`);
  }

  const pngPath = `${basePath}.png`;
  const svgPath = `${basePath}.svg`;

  await fs.writeFile(pngPath, pngBuffer);
  const b64 = pngBuffer.toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}">
  <title>The Outreach Project — store screenshot</title>
  <image width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xlink:href="data:image/png;base64,${b64}"/>
</svg>`;
  await fs.writeFile(svgPath, svg, "utf8");
}

async function captureViewport(page, basePath) {
  const pngBuffer = await page.screenshot({ type: "png", fullPage: false });
  await writeOutputs(pngBuffer, basePath);
}

async function waitForSettled(page, extraMs = 600) {
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
  await page.waitForTimeout(extraMs);
}

async function runCaptures(page) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(
    `[export-store-screenshots] Output size: ${OUTPUT_WIDTH}×${OUTPUT_HEIGHT} px (viewport ${VIEWPORT.width}×${VIEWPORT.height} @${DEVICE_SCALE}x)`,
  );

  const captures = [
    {
      name: "01-home",
      async run() {
        await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: SHOWCASE_CSS });
        await waitForSettled(page, 1200);
        await page.locator(".homeFeatureList, .homeDirectoryPanel, #home-directory").first().waitFor({
          state: "visible",
          timeout: 45_000,
        });
        await captureViewport(page, path.join(OUT_DIR, "01-home"));
      },
    },
    {
      name: "02-directory",
      async run() {
        await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: SHOWCASE_CSS });
        await waitForSettled(page, 1200);
        const directory = page.locator("#home-directory");
        await directory.waitFor({ state: "visible", timeout: 45_000 });
        await directory.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await captureViewport(page, path.join(OUT_DIR, "02-directory"));
      },
    },
    {
      name: "03-trusted-resources",
      async run() {
        await page.goto(`${BASE_URL}/trusted`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: HIDE_DEMO_RESET_CSS });
        await waitForSettled(page, 1200);
        await page
          .locator(".results--trustedBranded .trustedResourceCard, .results--trustedBranded article, .results--trustedBranded .card")
          .first()
          .waitFor({ state: "visible", timeout: 45_000 })
          .catch(async () => {
            await page.locator(".trustedRouteCard").waitFor({ state: "visible", timeout: 10_000 });
          });
        await captureViewport(page, path.join(OUT_DIR, "03-trusted-resources"));
      },
    },
    {
      name: "04-podcast",
      async run() {
        await page.goto(`${BASE_URL}/podcasts`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: HIDE_DEMO_RESET_CSS });
        await waitForSettled(page, 1500);
        await page
          .locator(".appShell--podcast, .podcastLanding, .podcastEpisodeCard, .podcastHero")
          .first()
          .waitFor({ state: "visible", timeout: 45_000 });
        await captureViewport(page, path.join(OUT_DIR, "04-podcast"));
      },
    },
    {
      name: "05-sponsors",
      async run() {
        await page.goto(`${BASE_URL}/sponsors`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: HIDE_DEMO_RESET_CSS });
        await waitForSettled(page, 1200);
        await page
          .locator(".sponsorPage, .sponsorLanding, .sponsorSection, .sponsorHub")
          .first()
          .waitFor({ state: "visible", timeout: 45_000 });
        await captureViewport(page, path.join(OUT_DIR, "05-sponsors"));
      },
    },
    {
      name: "06-profile",
      async run() {
        await page.goto(`${BASE_URL}/profile`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: `${SHOWCASE_CSS}\n${HIDE_DEMO_RESET_CSS}` });
        await waitForSettled(page, 1500);
        await page
          .locator(".profileTabShell .profileHeader, .profileTabShell h2, .profileTabShell .card")
          .first()
          .waitFor({ state: "visible", timeout: 45_000 });
        await captureViewport(page, path.join(OUT_DIR, "06-profile"));
      },
    },
    {
      name: "07-saved-organizations",
      async run() {
        await page.goto(`${BASE_URL}/profile`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: `${SHOWCASE_CSS}\n${HIDE_DEMO_RESET_CSS}` });
        await waitForSettled(page, 1500);
        const savedHeading = page.locator(".profileTabShell h3", { hasText: "Saved Organizations" });
        await savedHeading.waitFor({ state: "visible", timeout: 45_000 });
        await savedHeading.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await captureViewport(page, path.join(OUT_DIR, "07-saved-organizations"));
      },
    },
    {
      name: "08-community",
      async run() {
        await page.goto(`${BASE_URL}/community`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: HIDE_DEMO_RESET_CSS });
        await waitForSettled(page, 1500);
        await page
          .locator(".communityPage, .communityFeed, .communityPostCard, .shell")
          .first()
          .waitFor({ state: "visible", timeout: 45_000 });
        await captureViewport(page, path.join(OUT_DIR, "08-community"));
      },
    },
  ];

  for (const capture of captures) {
    if (ONLY_CAPTURE.length > 0 && !ONLY_CAPTURE.includes(capture.name)) continue;
    console.log(`[export-store-screenshots] Capturing ${capture.name}…`);
    await capture.run();
    console.log(`[export-store-screenshots] Wrote ${capture.name}.png + ${capture.name}.svg`);
  }
}

async function main() {
  let devChild = null;
  try {
    devChild = await maybeStartDevServer();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
      colorScheme: "light",
      locale: "en-US",
    });

    await context.addInitScript(buildSeedScript());
    const page = await context.newPage();

    await runCaptures(page);

    await browser.close();
    console.log(`[export-store-screenshots] Done — ${OUT_DIR}`);
  } finally {
    if (devChild && !devChild.killed) {
      devChild.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error("[export-store-screenshots] Failed:", err?.message || err);
  process.exit(1);
});
