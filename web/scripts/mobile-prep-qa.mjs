/**
 * Capacitor sync pointed at QA / Preview host.
 * Usage: pnpm --dir web run mobile:prep:qa
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const capServerUrl = String(
  process.env.CAP_SERVER_URL || "https://qa.theoutreachproject.app",
).trim().replace(/\/$/, "");

const env = { ...process.env, CAP_SERVER_URL: capServerUrl, CAP_SERVER_PROFILE: "qa" };
console.log(`[mobile:prep:qa] CAP_SERVER_URL=${capServerUrl}`);

const r = spawnSync("node", ["scripts/mobile-prep.mjs", capServerUrl], {
  cwd: webRoot,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
