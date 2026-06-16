/**
 * Static security posture checks (no live Supabase required).
 * Run: pnpm --dir web run verify:security
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(webRoot, "src");

const failures = [];

function read(rel) {
  const p = path.join(webRoot, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

// Critical fixes must remain in place
assert(
  !read("src/lib/auth/workosRouteAuth.js").includes("if (profileRow) {\n    return { kind: \"ok\""),
  "workosRouteAuth.js must not bypass org check for any profile row",
);

assert(
  read("src/app/api/admin/form-submissions/route.js").includes('from "@/lib/admin/adminAuditLog"'),
  "form-submissions route must import writeAdminAuditLog",
);

assert(
  read("src/lib/capacitor/openExternalUrl.js").includes("validateExternalBrowserUrl"),
  "openExternalUrl must use external URL allowlist",
);

assert(
  read("src/app/api/billing/webhook/route.js").includes("status: 500"),
  "Stripe webhook must return 500 on handler failure",
);

assert(
  fs.existsSync(path.join(webRoot, "supabase/supabase_public_rls_hardening_2026_06.sql")),
  "supabase_public_rls_hardening_2026_06.sql must exist",
);

assert(
  !read("src/lib/community/moderatorServer.js").includes("NEXT_PUBLIC_COMMUNITY_MODERATOR"),
  "moderator allowlist must use server-only env vars",
);

assert(
  read("src/app/api/community/posts/route.js").includes("sanitizeCommunityStoryPhotoUrl"),
  "community photo_url must be length-limited",
);

// Security headers module present
assert(fs.existsSync(path.join(srcRoot, "lib/security/httpHeaders.js")), "httpHeaders.js required");

// No obvious secrets in src
function scanSecrets(dir) {
  const bad = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") {
      bad.push(...scanSecrets(full));
      continue;
    }
    if (!/\.(js|jsx|ts|tsx|mjs)$/.test(ent.name)) continue;
    const text = fs.readFileSync(full, "utf8");
    if (/sk_live_[a-zA-Z0-9]{10,}/.test(text) || /sk_test_[a-zA-Z0-9]{10,}/.test(text)) {
      bad.push(full);
    }
  }
  return bad;
}

const secretHits = scanSecrets(srcRoot);
assert(secretHits.length === 0, `Possible Stripe keys in src: ${secretHits.join(", ")}`);

if (failures.length) {
  console.error("[verify:security] FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("[verify:security] OK — static posture checks passed.");
