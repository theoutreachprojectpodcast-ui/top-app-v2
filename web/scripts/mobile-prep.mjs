/**
 * Sync Capacitor native projects for a given remote Next origin.
 *
 * Usage:
 *   CAP_SERVER_URL=https://theoutreachproject.app pnpm --dir web run mobile:prep:url
 *   pnpm --dir web run mobile:prep:url -- https://qa.theoutreachproject.app
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argUrl = process.argv.slice(2).find((a) => a.startsWith("http"));
const capServerUrl = String(
  argUrl || process.env.CAP_SERVER_URL || "https://theoutreachproject.app",
).trim().replace(/\/$/, "");

if (!capServerUrl.startsWith("http")) {
  console.error("[mobile:prep] CAP_SERVER_URL must be an http(s) origin.");
  process.exit(1);
}

console.log(`[mobile:prep] CAP_SERVER_URL=${capServerUrl}`);

const env = { ...process.env, CAP_SERVER_URL: capServerUrl };

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: webRoot, env, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("pnpm", ["run", "build"]);
run("pnpm", ["exec", "cap", "sync"]);

console.log("[mobile:prep] Done. Open native IDEs: pnpm run cap:open:ios | cap:open:android");
