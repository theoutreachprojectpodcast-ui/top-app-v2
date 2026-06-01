import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "api");

const SKIP = new Set([
  "billing/webhook/route.js",
  "auth/workos/signin/route.js",
  "auth/workos/signup/route.js",
]);

const RATE = {
  "contact/route.js": { key: "public-contact", limit: 12 },
  "sponsor-applications/route.js": { key: "public-sponsor-app", limit: 8 },
  "podcasts/apply-guest/route.js": { key: "public-guest-app", limit: 8 },
  "billing/checkout/route.js": { key: "billing-checkout", limit: 20 },
  "billing/portal/route.js": { key: "billing-portal", limit: 20 },
  "billing/podcast-sponsor-checkout/route.js": { key: "billing-podcast-checkout", limit: 12 },
  "me/profile/route.js": { key: "me-profile", limit: 40 },
  "me/avatar/route.js": { key: "me-avatar", limit: 20 },
  "me/favorites/route.js": { key: "me-favorites", limit: 40 },
  "me/saved-orgs/route.js": { key: "me-saved-orgs", limit: 40 },
  "me/onboarding/complete/route.js": { key: "me-onboarding", limit: 20 },
  "me/notifications/route.js": { key: "me-notifications", limit: 60 },
  "community/posts/route.js": { key: "community-posts", limit: 20 },
  "community/posts/[id]/route.js": { key: "community-post-patch", limit: 30 },
  "community/posts/[id]/like/route.js": { key: "community-like", limit: 60 },
  "directory/search/route.js": { key: "directory-search", limit: 60 },
  "notifications/triggers/trusted-resource-application/route.js": {
    key: "notify-trusted-app",
    limit: 20,
  },
  "nonprofit/enrich/route.js": { key: "nonprofit-enrich", limit: 15 },
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
  if (SKIP.has(rel)) continue;

  let src = fs.readFileSync(file, "utf8");
  if (!/export async function (POST|PUT|PATCH|DELETE)/.test(src)) continue;
  if (src.includes("guardMutation(request")) continue;

  const cfg = RATE[rel] || { key: `api-${rel.replace(/\/route\.js$/, "").replace(/\//g, "-")}`, limit: 40 };

  if (!src.includes("@/lib/security/secureRoute")) {
    const importMatch = src.match(/^import .+;\n/m);
    if (importMatch) {
      src = src.replace(importMatch[0], `${importMatch[0]}${GUARD_IMPORT}`);
    } else {
      src = `${GUARD_IMPORT}${src}`;
    }
  }

  src = src.replace(
    /export async function (POST|PUT|PATCH|DELETE)\(([^)]*)\) \{\n/g,
    (full, method, params) => {
      const hasRequest = /\brequest\b/.test(params);
      const fnParams = hasRequest ? params : params.trim() ? `${params}, request` : "request";
      return `export async function ${method}(${fnParams}) {\n  const __guard = guardMutation(request, { rateKey: "${cfg.key}", limit: ${cfg.limit} });\n  if (!__guard.ok) return guardFailureResponse(__guard);\n`;
    },
  );

  fs.writeFileSync(file, src, "utf8");
  console.log("patched", rel);
}
