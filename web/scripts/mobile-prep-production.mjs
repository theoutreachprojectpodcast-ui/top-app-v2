/**
 * Prepare Capacitor native projects for Production WebView URL.
 * Usage: pnpm --dir web run mobile:prep:prod
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const capServerUrl = String(process.env.CAP_SERVER_URL || "https://theoutreachproject.app").trim();

console.log(`[mobile:prep:prod] CAP_SERVER_URL=${capServerUrl}`);

const env = { ...process.env, CAP_SERVER_URL: capServerUrl };

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: webRoot, env, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("pnpm", ["run", "build"]);
run("pnpm", ["exec", "cap", "sync"]);

console.log("[mobile:prep:prod] Done. Open Android Studio or Xcode and create a signed release build.");
