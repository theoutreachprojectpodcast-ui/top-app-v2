/**
 * One-shot store release prep: production web build + native sync + validation.
 * Does not archive IPA or sign AAB — those steps need Xcode / keystore on your machine.
 *
 * Usage (repo root):
 *   pnpm run mobile:store:prep
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webRoot = path.join(repoRoot, "web");

function run(label, cmd, args, cwd = repoRoot) {
  console.log(`\n[mobile:store:prep] ${label}`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error(`[mobile:store:prep] Failed: ${label}`);
    process.exit(r.status ?? 1);
  }
}

run("validate Capacitor config", "pnpm", ["--dir", "web", "run", "validate:capacitor"]);
run("production mobile prep (build + sync + verify)", "pnpm", ["--dir", "web", "run", "mobile:prep:prod"]);

console.log(`
[mobile:store:prep] Native projects are synced for production.

Next — iOS (Mac + Xcode):
  1. Xcode → Settings → Components → install iOS platform if missing
  2. pnpm --dir web run cap:open:ios
  3. Increment build number → Product → Archive → App Store Connect
  See: IOS_APP_STORE_RELEASE_CHECKLIST.md

Next — Android (Android Studio or CLI):
  1. cp web/android/keystore.properties.example web/android/keystore.properties
  2. Generate upload keystore (see ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md §2)
  3. pnpm --dir web run mobile:android:bundle
  4. Upload app-release.aab to Play Console internal testing
  See: ANDROID_PLAY_STORE_RELEASE_CHECKLIST.md

Store copy & review notes: docs/store-listing-copy.md · docs/store-policy-forms.md
`);
