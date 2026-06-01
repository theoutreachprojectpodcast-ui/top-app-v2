import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "api");

const RATE = {
  "contact/route.js": { key: "public-contact", limit: 12 },
  "billing/checkout/route.js": { key: "billing-checkout", limit: 20 },
  "billing/portal/route.js": { key: "billing-portal", limit: 20 },
  "billing/podcast-sponsor-checkout/route.js": { key: "billing-podcast-checkout", limit: 12 },
  "billing/webhook/route.js": { key: "billing-webhook", limit: 200, skipOrigin: true },
  "community/posts/route.js": { key: "community-posts", limit: 20 },
  "community/posts/[id]/route.js": { key: "community-post-patch", limit: 30 },
  "community/posts/[id]/like/route.js": { key: "community-like", limit: 60 },
  "directory/search/route.js": { key: "directory-search", limit: 60 },
  "me/avatar/route.js": { key: "me-avatar", limit: 20 },
  "me/favorites/route.js": { key: "me-favorites", limit: 40 },
  "me/saved-orgs/route.js": { key: "me-saved-orgs", limit: 40 },
  "me/profile/route.js": { key: "me-profile", limit: 40 },
  "sponsor-applications/route.js": { key: "public-sponsor-app", limit: 8 },
  "sponsors/enrich/route.js": { key: "sponsors-enrich", limit: 15 },
};

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === "route.js") out.push(p);
  }
  return out;
}

const GUARD_IMPORT =
  'import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";\n';

for (const file of walk(apiRoot)) {
  const rel = path.relative(apiRoot, file).replace(/\\/g, "/");
  if (rel.startsWith("admin/")) continue;

  let src = fs.readFileSync(file, "utf8");
  if (!/export async function (POST|PUT|PATCH|DELETE)/.test(src)) continue;
  if (src.includes("__guard = guardMutation")) continue;

  const cfg = RATE[rel] || {
    key: `api-${rel.replace(/\/route\.js$/, "").replace(/\//g, "-")}`,
    limit: 40,
    skipOrigin: false,
  };

  if (!src.includes("@/lib/security/secureRoute")) {
    const importMatch = src.match(/^import .+;\n/m);
    src = importMatch
      ? src.replace(importMatch[0], `${importMatch[0]}${GUARD_IMPORT}`)
      : `${GUARD_IMPORT}${src}`;
  }

  const skipOrigin = cfg.skipOrigin ? ", skipOriginCheck: true" : "";
  const guardBlock = `  const __guard = guardMutation(request, { rateKey: "${cfg.key}", limit: ${cfg.limit}${skipOrigin} });\n  if (!__guard.ok) return guardFailureResponse(__guard);\n`;

  src = src.replace(
    /(export async function (?:POST|PUT|PATCH|DELETE)\([^)]*\) \{\r?\n)/,
    `$1${guardBlock}`,
  );

  fs.writeFileSync(file, src, "utf8");
  console.log("fixed", rel);
}
