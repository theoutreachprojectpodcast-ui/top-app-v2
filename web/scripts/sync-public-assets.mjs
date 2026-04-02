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

try {
  await fs.mkdir(path.join(webRoot, "public"), { recursive: true });
  await fs.cp(src, dest, { recursive: true, force: true });
  console.log("[sync-public-assets] copied ../assets -> public/assets");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  const strict = process.env.CI === "true" || process.env.STRICT_ASSET_SYNC === "1";
  console.error("[sync-public-assets] copy failed:", msg);
  if (strict) {
    process.exit(1);
  }
  console.warn("[sync-public-assets] continuing (set CI=true or STRICT_ASSET_SYNC=1 to fail the build)");
  console.warn("[sync-public-assets] tip: close apps locking web/public; OneDrive can block copies");
}

process.exit(0);
