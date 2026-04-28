import { access } from "node:fs/promises";
import path from "node:path";

const requiredRouteFiles = [
  "src/app/page.js",
  "src/app/admin/layout.js",
  "src/app/admin/page.js",
  "src/app/profile/page.js",
  "src/app/settings/page.js",
  "src/app/community/page.js",
  "src/app/trusted/page.js",
  "src/app/contact/page.js",
  "src/app/sponsors/page.js",
  "src/app/podcasts/page.js",
  "src/app/notifications/page.js",
  "src/app/api/me/route.js",
  "src/app/api/me/profile/route.js",
  "src/app/api/community/posts/route.js",
  "src/app/api/sponsors/catalog/route.js",
  "src/app/api/trusted/catalog/route.js",
];

const missing = [];
for (const rel of requiredRouteFiles) {
  const full = path.resolve(process.cwd(), rel);
  try {
    await access(full);
  } catch {
    missing.push(rel);
  }
}

if (missing.length) {
  console.error("[smoke:routes] Missing required route files:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`[smoke:routes] OK (${requiredRouteFiles.length} required route files found)`);
