/**
 * Fail CI when landscape support is reintroduced into the native shell.
 *
 * Authoritative orientation sources (do not rely on CSS/JS alone):
 *   - iOS:  web/ios/App/App/Info.plist  (UISupportedInterfaceOrientations + ~ipad)
 *           + AppDelegate / MainViewController portrait masks
 *   - Android: web/android/app/src/main/AndroidManifest.xml (android:screenOrientation)
 *           + MainActivity.setRequestedOrientation(PORTRAIT)
 *
 * Capacitor ScreenOrientation.lock is a secondary runtime safeguard only.
 * ScreenOrientation.unlock must never appear in app source (it clears Android's lock).
 *
 * Usage: pnpm --dir web run validate:portrait-orientation
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function fail(msg) {
  console.error(`[validate:portrait] FAIL ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[validate:portrait] OK ${msg}`);
}

function read(rel) {
  const abs = path.join(webRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing file ${rel}`);
    return null;
  }
  return fs.readFileSync(abs, "utf8");
}

function extractPlistArray(plist, key) {
  const keyIdx = plist.indexOf(`<key>${key}</key>`);
  if (keyIdx < 0) return null;
  const after = plist.slice(keyIdx);
  const arrayMatch = after.match(/<array>([\s\S]*?)<\/array>/);
  if (!arrayMatch) return [];
  return [...arrayMatch[1].matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]);
}

// --- iOS Info.plist (authoritative for App Store binary) ---
const infoPlist = read("ios/App/App/Info.plist");
if (infoPlist) {
  const phone = extractPlistArray(infoPlist, "UISupportedInterfaceOrientations");
  const ipad = extractPlistArray(infoPlist, "UISupportedInterfaceOrientations~ipad");

  if (!phone) fail("Info.plist missing UISupportedInterfaceOrientations");
  else if (phone.length !== 1 || phone[0] !== "UIInterfaceOrientationPortrait") {
    fail(`iPhone orientations must be portrait-only, got: ${JSON.stringify(phone)}`);
  } else ok("Info.plist iPhone portrait-only");

  if (!ipad) fail("Info.plist missing UISupportedInterfaceOrientations~ipad");
  else if (ipad.length !== 1 || ipad[0] !== "UIInterfaceOrientationPortrait") {
    fail(`iPad orientations must be portrait-only, got: ${JSON.stringify(ipad)}`);
  } else ok("Info.plist iPad portrait-only");

  for (const bad of [
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight",
    "UIInterfaceOrientationPortraitUpsideDown",
  ]) {
    if (infoPlist.includes(bad)) fail(`Info.plist still declares ${bad}`);
  }

  if (!infoPlist.includes("<key>UIRequiresFullScreen</key>") || !/<key>UIRequiresFullScreen<\/key>\s*<true\/>/.test(infoPlist)) {
    fail("Info.plist must set UIRequiresFullScreen=true so iPad multitasking cannot widen to landscape");
  } else ok("Info.plist UIRequiresFullScreen=true");
}

// --- iOS native controllers ---
const appDelegate = read("ios/App/App/AppDelegate.swift");
if (appDelegate) {
  if (!/supportedInterfaceOrientationsFor[\s\S]*?\.portrait/.test(appDelegate)) {
    fail("AppDelegate must return .portrait from supportedInterfaceOrientationsFor");
  } else ok("AppDelegate portrait mask");
}

const mainVc = read("ios/App/App/MainViewController.swift");
if (mainVc) {
  if (!/supportedInterfaceOrientations[\s\S]*?\.portrait/.test(mainVc)) {
    fail("MainViewController must override supportedInterfaceOrientations → .portrait");
  } else ok("MainViewController portrait mask");
  if (!/shouldAutorotate[\s\S]*?false/.test(mainVc)) {
    fail("MainViewController shouldAutorotate must be false");
  } else ok("MainViewController shouldAutorotate=false");
}

const storyboard = read("ios/App/App/Base.lproj/Main.storyboard");
if (storyboard && !storyboard.includes('customClass="MainViewController"')) {
  fail('Main.storyboard root VC must use customClass="MainViewController"');
} else if (storyboard) ok("Main.storyboard → MainViewController");

// Xcode build settings must not reintroduce landscape via INFOPLIST_KEY overrides
const pbxproj = read("ios/App/App.xcodeproj/project.pbxproj");
if (pbxproj) {
  if (/INFOPLIST_KEY_UISupportedInterfaceOrientations/.test(pbxproj)) {
    fail("project.pbxproj must not set INFOPLIST_KEY_UISupportedInterfaceOrientations* (Info.plist is authoritative)");
  } else ok("pbxproj has no orientation INFOPLIST_KEY overrides");
}

// --- Android manifest ---
const manifest = read("android/app/src/main/AndroidManifest.xml");
if (manifest) {
  const activityBlocks = [...manifest.matchAll(/<activity\b[\s\S]*?(?:\/>|<\/activity>)/g)].map((m) => m[0]);
  const main = activityBlocks.find((b) => b.includes("org.theoutreachproject.top.MainActivity"));
  if (!main || !main.includes('android:screenOrientation="portrait"')) {
    fail('AndroidManifest MainActivity must set android:screenOrientation="portrait"');
  } else ok("AndroidManifest MainActivity portrait");

  const browser = activityBlocks.find((b) =>
    b.includes("com.capacitorjs.plugins.browser.BrowserControllerActivity"),
  );
  if (!browser || !browser.includes('android:screenOrientation="portrait"')) {
    fail("AndroidManifest must lock BrowserControllerActivity to portrait (Capacitor Browser plugin)");
  } else ok("AndroidManifest BrowserControllerActivity portrait");

  if (/android:screenOrientation="(?:sensor|fullSensor|user|unspecified|landscape|sensorLandscape)"/.test(manifest)) {
    fail("AndroidManifest contains a non-portrait screenOrientation");
  }
}

const mainActivity = read("android/app/src/main/java/org/theoutreachproject/top/MainActivity.java");
if (mainActivity) {
  if (!mainActivity.includes("SCREEN_ORIENTATION_PORTRAIT")) {
    fail("MainActivity must call setRequestedOrientation(SCREEN_ORIENTATION_PORTRAIT)");
  } else ok("MainActivity runtime portrait lock");
}

// --- App source must never unlock orientation ---
const unlockHits = [];
function walkJs(dirRel) {
  const abs = path.join(webRoot, dirRel);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) walkJs(rel);
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
      const text = fs.readFileSync(path.join(webRoot, rel), "utf8");
      if (/ScreenOrientation\s*\.\s*unlock\s*\(/.test(text) || /screen\.orientation\.unlock\s*\(/.test(text)) {
        unlockHits.push(rel.replace(/\\/g, "/"));
      }
    }
  }
}
walkJs("src");
if (unlockHits.length) {
  fail(`orientation unlock found in: ${unlockHits.join(", ")}`);
} else ok("no ScreenOrientation.unlock in app source");

// Runtime lock helper must exist
const lockHelper = read("src/lib/capacitor/lockPortraitOrientation.js");
if (lockHelper && !lockHelper.includes("ScreenOrientation.lock")) {
  fail("lockPortraitOrientation.js must call ScreenOrientation.lock");
} else if (lockHelper) ok("lockPortraitOrientation.js present");

if (failed) {
  console.error("\n[validate:portrait] Portrait lock validation failed.");
  process.exit(1);
}

console.log("\n[validate:portrait] All portrait-orientation checks passed.");
