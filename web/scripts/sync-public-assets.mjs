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

  const iconNames = ["icon-512.png", "icon-192.png", "icon-1024.png", "apple-touch-icon.png", "favicon-32x32.png"];
  for (const name of iconNames) {
    const from = path.join(src, name);
    try {
      await fs.access(from);
      await fs.copyFile(from, path.join(webRoot, "public", name));
      console.log(`[sync-public-assets] copied assets/${name} -> public/${name}`);
    } catch {
      /* optional per-file */
    }
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  // Only STRICT_ASSET_SYNC fails the script — many dev shells set CI=true; that should not block `pnpm dev`.
  const strict = process.env.STRICT_ASSET_SYNC === "1";
  console.error("[sync-public-assets] copy failed:", msg);
  if (strict) {
    process.exit(1);
  }
  console.warn("[sync-public-assets] continuing (set STRICT_ASSET_SYNC=1 to fail on copy errors)");
  console.warn("[sync-public-assets] tip: close apps locking web/public; OneDrive can block copies");
}

process.exit(0);
