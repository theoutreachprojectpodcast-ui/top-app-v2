import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const dest = path.join(webRoot, "public", "assets");
const src = path.join(webRoot, "..", "assets");

try {
  await fs.access(src);
} catch {
  console.warn("[sync-public-assets] ../assets not found; skip (standalone web/ checkout?)");
  process.exit(0);
}

await fs.mkdir(path.join(webRoot, "public"), { recursive: true });
await fs.cp(src, dest, { recursive: true, force: true });
console.log("[sync-public-assets] copied ../assets -> public/assets");
