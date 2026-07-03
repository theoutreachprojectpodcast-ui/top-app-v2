/**
 * Build a signed Android App Bundle (AAB) for Play Console upload.
 *
 * Prerequisites:
 *   1. pnpm --dir web run mobile:prep:prod  (or mobile:store:prep)
 *   2. web/android/keystore.properties (copy from keystore.properties.example)
 *   3. JAVA_HOME → Android Studio JBR (or JDK 17+)
 *
 * Usage:
 *   pnpm --dir web run mobile:android:bundle
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = path.join(webRoot, "android");
const buildGradle = path.join(androidRoot, "app/build.gradle");
const keystoreProps = path.join(androidRoot, "keystore.properties");
const gradlew = path.join(androidRoot, process.platform === "win32" ? "gradlew.bat" : "gradlew");
const bundletoolJar = path.join(webRoot, "scripts/tools/bundletool-all.jar");
const BUNDLETOOL_URL =
  "https://github.com/google/bundletool/releases/download/1.18.0/bundletool-all-1.18.0.jar";

function readBuildGradleVersion() {
  const text = fs.readFileSync(buildGradle, "utf8");
  const code = text.match(/versionCode\s+(\d+)/)?.[1];
  const name = text.match(/versionName\s+"([^"]+)"/)?.[1];
  const appId = text.match(/applicationId\s+"([^"]+)"/)?.[1];
  return { versionCode: code ? Number(code) : null, versionName: name, applicationId: appId };
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  const candidates = [
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "bin", process.platform === "win32" ? "java.exe" : "java"))) {
      return c;
    }
  }
  return null;
}

function ensureBundletool() {
  if (fs.existsSync(bundletoolJar)) return true;
  fs.mkdirSync(path.dirname(bundletoolJar), { recursive: true });
  console.log("[mobile:android:bundle] Downloading bundletool for AAB verification…");
  return new Promise((resolve) => {
    const file = fs.createWriteStream(bundletoolJar);
    https
      .get(BUNDLETOOL_URL, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (r2) => r2.pipe(file)).on("error", () => resolve(false));
          file.on("finish", () => {
            file.close();
            resolve(true);
          });
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(true);
        });
      })
      .on("error", () => resolve(false));
  });
}

function dumpAabManifest(aabPath, javaHome) {
  const java = path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
  const r = spawnSync(java, ["-jar", bundletoolJar, "dump", "manifest", `--bundle=${aabPath}`], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return r.stdout || "";
}

function parseManifestFields(manifestXml) {
  const packageName = manifestXml.match(/package="([^"]+)"/)?.[1] ?? null;
  const versionCode = manifestXml.match(/android:versionCode="(\d+)"/)?.[1] ?? null;
  const versionName = manifestXml.match(/android:versionName="([^"]+)"/)?.[1] ?? null;
  return { packageName, versionCode: versionCode ? Number(versionCode) : null, versionName };
}

if (!fs.existsSync(keystoreProps)) {
  console.error(
    "[mobile:android:bundle] Missing web/android/keystore.properties\n" +
      "  cp web/android/keystore.properties.example web/android/keystore.properties\n" +
      "  Generate keystore — see ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md §2",
  );
  process.exit(1);
}

if (!fs.existsSync(gradlew)) {
  console.error("[mobile:android:bundle] Gradle wrapper not found at", gradlew);
  process.exit(1);
}

const expected = readBuildGradleVersion();
console.log(
  `[mobile:android:bundle] Target ${expected.applicationId} versionCode=${expected.versionCode} versionName=${expected.versionName}`,
);

const embeddedConfig = path.join(androidRoot, "app/src/main/assets/capacitor.config.json");
if (!fs.existsSync(embeddedConfig)) {
  console.warn("[mobile:android:bundle] No embedded capacitor.config.json — run mobile:prep:prod first");
}

console.log("[mobile:android:bundle] clean bundleRelease…");

const r = spawnSync(gradlew, ["clean", "bundleRelease"], {
  cwd: androidRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (r.status !== 0) {
  process.exit(r.status ?? 1);
}

const aab = path.join(androidRoot, "app/build/outputs/bundle/release/app-release.aab");
if (!fs.existsSync(aab)) {
  console.error("[mobile:android:bundle] Gradle finished but AAB not found at expected path");
  process.exit(1);
}

const stat = fs.statSync(aab);
const javaHome = resolveJavaHome();
let verified = false;

if (javaHome && (await ensureBundletool())) {
  const manifest = dumpAabManifest(aab, javaHome);
  if (manifest) {
    const actual = parseManifestFields(manifest);
    console.log(
      `[mobile:android:bundle] Verified AAB: package=${actual.packageName} versionCode=${actual.versionCode} versionName=${actual.versionName}`,
    );
    if (actual.versionCode !== expected.versionCode) {
      console.error(
        `[mobile:android:bundle] FAIL versionCode mismatch — build.gradle=${expected.versionCode} AAB=${actual.versionCode}`,
      );
      process.exit(1);
    }
    if (actual.packageName !== expected.applicationId) {
      console.error(
        `[mobile:android:bundle] FAIL package mismatch — build.gradle=${expected.applicationId} AAB=${actual.packageName}`,
      );
      process.exit(1);
    }
    verified = true;
  }
}

if (!verified) {
  console.warn("[mobile:android:bundle] Could not verify AAB manifest (bundletool/java unavailable)");
}

console.log(`[mobile:android:bundle] OK → ${aab}`);
console.log(`[mobile:android:bundle] Size: ${Math.round(stat.size / 1024)} KB | Built: ${stat.mtime.toISOString()}`);
console.log(
  `[mobile:android:bundle] Upload versionCode ${expected.versionCode} to Play Console → Testing → Internal testing → Create new release`,
);
console.log("[mobile:android:bundle] Tip: each upload needs a NEW release with a HIGHER versionCode than any prior upload.");
