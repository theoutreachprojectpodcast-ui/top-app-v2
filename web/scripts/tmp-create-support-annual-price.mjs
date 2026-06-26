/**
 * @deprecated Use scripts/create-support-yearly-price.mjs ($0.99/year).
 * This wrapper kept for backwards compatibility — forwards to the correct script.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "create-support-yearly-price.mjs");
console.warn("[deprecated] tmp-create-support-annual-price.mjs — use create-support-yearly-price.mjs ($0.99/year)");
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
