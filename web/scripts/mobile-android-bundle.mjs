/**
 * Build a signed Android App Bundle (AAB) for Play Console upload.
 *
 * Prerequisites:
 *   1. pnpm --dir web run mobile:prep:prod
 *   2. web/android/keystore.properties (copy from keystore.properties.example)
 *   3. JAVA_HOME → Android Studio JBR (or JDK 17+)
 *
 * Usage:
 *   pnpm --dir web run mobile:android:bundle
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = path.join(webRoot, "android");
const keystoreProps = path.join(androidRoot, "keystore.properties");
const gradlew = path.join(androidRoot, process.platform === "win32" ? "gradlew.bat" : "gradlew");

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

const embeddedConfig = path.join(androidRoot, "app/src/main/assets/capacitor.config.json");
if (!fs.existsSync(embeddedConfig)) {
  console.warn("[mobile:android:bundle] No embedded capacitor.config.json — run mobile:prep:prod first");
}

console.log("[mobile:android:bundle] bundleRelease…");

const r = spawnSync(gradlew, ["bundleRelease"], {
  cwd: androidRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (r.status !== 0) {
  process.exit(r.status ?? 1);
}

const aab = path.join(androidRoot, "app/build/outputs/bundle/release/app-release.aab");
if (fs.existsSync(aab)) {
  const stat = fs.statSync(aab);
  console.log(`[mobile:android:bundle] OK → ${aab} (${Math.round(stat.size / 1024)} KB)`);
  console.log("[mobile:android:bundle] Upload to Play Console → Testing → Internal testing");
} else {
  console.warn("[mobile:android:bundle] Gradle finished but AAB not found at expected path");
}
