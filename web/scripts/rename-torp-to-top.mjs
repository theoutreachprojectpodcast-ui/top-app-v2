/**
 * One-time repo rename: torp → top (branding / table names / CSS / constants).
 * Usage: node web/scripts/rename-torp-to-top.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "build",
  "Pods",
  "DerivedData",
  ".gradle",
  "agent-transcripts",
]);

const SKIP_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".keystore",
  ".aab",
  ".apk",
  ".jar",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".svg",
]);

/** Longest-first replacements (case-sensitive). */
const REPLACEMENTS = [
  ["org.theoutreachproject.top", "org.theoutreachproject.top"],
  ["top_platform_notifications", "top_platform_notifications"],
  ["top_org_public_updates", "top_org_public_updates"],
  ["top_oauth_mobile_handoffs", "top_oauth_mobile_handoffs"],
  ["top_profiles_membership", "top_profiles_membership"],
  ["top_profiles_stripe", "top_profiles_stripe"],
  ["top_profiles_last_login", "top_profiles_last_login"],
  ["top_profiles", "top_profiles"],
  ["top_profile_id", "top_profile_id"],
  ["top_local_data_seed", "top_local_data_seed"],
  ["top_web_trusted_resource_form", "top_web_trusted_resource_form"],
  ["top_qa_profiles_shadow_top_trg", "top_qa_profiles_shadow_top_trg"],
  ["TOP_OAUTH_SHELL_NATIVE", "TOP_OAUTH_SHELL_NATIVE"],
  ["TOP_OAUTH_SHELL_COOKIE", "TOP_OAUTH_SHELL_COOKIE"],
  ["TOP_OAUTH_POLL_KEY_COOKIE", "TOP_OAUTH_POLL_KEY_COOKIE"],
  ["TOP_OAUTH_BROWSER_PENDING", "TOP_OAUTH_BROWSER_PENDING"],
  ["TOP_OAUTH_RETURN_KEY", "TOP_OAUTH_RETURN_KEY"],
  ["TOP_OAUTH_STATE_KEY", "TOP_OAUTH_STATE_KEY"],
  ["top-oauth-state-key", "top-oauth-state-key"],
  ["top-oauth-browser-pending", "top-oauth-browser-pending"],
  ["top-oauth-browser", "top-oauth-browser"],
  ["top-oauth-return", "top-oauth-return"],
  ["top-oauth-poll-key", "top-oauth-poll-key"],
  ["top-oauth-shell", "top-oauth-shell"],
  ["top_remember_email_pref", "top_remember_email_pref"],
  ["top_workos_remember_device", "top_workos_remember_device"],
  ["top_last_used_email", "top_last_used_email"],
  ["topEntityNameDisplay", "topEntityNameDisplay"],
  ["topListingCardHeroScrim", "topListingCardHeroScrim"],
  ["topListingCardHeroWrap", "topListingCardHeroWrap"],
  ["topListingCardHero", "topListingCardHero"],
  ["topListingCardBody", "topListingCardBody"],
  ["topListingCard", "topListingCard"],
  ["data-top-listing-category", "data-top-listing-category"],
  ["data-top-card-interactive", "data-top-card-interactive"],
  ["top-listing-cards", "top-listing-cards"],
  ["_top_schema_health", "_top_schema_health"],
  ["_top_ensure_client_deny_rls", "_top_ensure_client_deny_rls"],
  ["_top_rls_security_audit", "_top_rls_security_audit"],
  ["_top_rls_helpers", "_top_rls_helpers"],
  ["top-seed", "top-seed"],
  ["topSpin", "topSpin"],
  ["topAuth__", "topAuth__"],
  ["topAuth", "topAuth"],
  ["--top-", "--top-"],
  ["[top]", "[top]"],
  ["TOP", "TOP"],
  ["TOP_", "TOP_"],
  ["NOTIFICATIONS_TOP_", "NOTIFICATIONS_TOP_"],
  ["_sync_top_qa_profile_shadow_to_top", "_sync_top_qa_profile_shadow_to_top"],
  ["_top_linter_security_status", "_top_linter_security_status"],
  ["_top_enable_deny_public_rls", "_top_enable_deny_public_rls"],
  ["_top_admin_enrichment_metrics", "_top_admin_enrichment_metrics"],
  ["_top_apply_table_rls_if_exists", "_top_apply_table_rls_if_exists"],
  ["top_account_access_model_v03.sql", "top_account_access_model_v03.sql"],
  ["top_v03_profiles.sql", "top_v03_profiles.sql"],
  ["top_profiles_membership_source.sql", "top_profiles_membership_source.sql"],
  ["top_offline_queue", "top_offline_queue"],
  ["top_local_fallback", "top_local_fallback"],
  ["top-directory-session-v1", "top-directory-session-v1"],
  ["top_nav_auth_v1", "top_nav_auth_v1"],
  ["top-profile-edit-pending", "top-profile-edit-pending"],
  ["top-profile-edit-open", "top-profile-edit-open"],
  ["top-color-scheme", "top-color-scheme"],
  ["top:community-share", "top:community-share"],
  ["top:crm:trusted-resource-lead", "top:crm:trusted-resource-lead"],
  ["[top-mobile]", "[top-mobile]"],
  ["topEntityNameInline", "topEntityNameInline"],
  ["top-band-texture", "top-band-texture"],
  ["data-top-header-brand", "data-top-header-brand"],
  ["__topOAuthHandoffs", "__topOAuthHandoffs"],
  ["__top_authorize:", "__top_authorize:"],
  ["__top_oauth:", "__top_oauth:"],
  ["top-ios-001", "top-ios-001"],
  ["top-settings-", "top-settings-"],
  ["top-delete-", "top-delete-"],
  ["top-profile-edit-", "top-profile-edit-"],
  ["top-edit-", "top-edit-"],
  ["top-onboarding-", "top-onboarding-"],
  ["top-demo-auth-", "top-demo-auth-"],
  ["top-id-seg", "top-id-seg"],
  ["top-org-affil", "top-org-affil"],
  ["top-job", "top-job"],
  ["top-service", "top-service"],
  ["top-bio", "top-bio"],
  ["top-why", "top-why"],
  ["top-causes", "top-causes"],
  ["top-support-needs", "top-support-needs"],
  ["top-communities", "top-communities"],
  ["top-skills", "top-skills"],
  ["top-volunteer", "top-volunteer"],
  ["top-contrib-sum", "top-contrib-sum"],
  ["top-pref-contrib-contact", "top-pref-contrib-contact"],
  ["top-sponsor-app-notes", "top-sponsor-app-notes"],
  [" filter `top`", " filter `top`"],
];

function shouldSkipDir(dirPath) {
  return SKIP_DIR_NAMES.has(path.basename(dirPath));
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(full)) continue;
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function applyReplacements(text) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

function renamePathIfNeeded(filePath) {
  const base = path.basename(filePath);
  if (!/torp/i.test(base)) return filePath;
  const dir = path.dirname(filePath);
  const nextBase = base
    .replace(/top-listing-cards/g, "top-listing-cards")
    .replace(/_torp_/g, "_top_")
    .replace(/torp_/g, "top_")
    .replace(/TOP_/g, "TOP_")
    .replace(/torp-v03/g, "top-v03")
    .replace(/torp-v0/g, "top-v0")
    .replace(/torp\.java$/i, "top.java")
    .replace(/\/torp\//g, "/top/");
  if (nextBase === base) return filePath;
  const next = path.join(dir, nextBase);
  fs.mkdirSync(path.dirname(next), { recursive: true });
  fs.renameSync(filePath, next);
  return next;
}

let changedFiles = 0;
let renamedFiles = 0;

for (const filePath of walkFiles(repoRoot)) {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXT.has(ext)) continue;
  if (filePath.includes(`${path.sep}android${path.sep}app${path.sep}build${path.sep}`)) continue;
  if (filePath.includes(`${path.sep}android${path.sep}build${path.sep}`)) continue;

  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    continue;
  }
  if (!/torp/i.test(text) && !/torp/i.test(path.basename(filePath))) continue;

  const next = applyReplacements(text);
  if (next !== text) {
    fs.writeFileSync(filePath, next, "utf8");
    changedFiles += 1;
  }
}

// Rename files (deepest paths first)
const allFiles = walkFiles(repoRoot).sort((a, b) => b.length - a.length);
for (const filePath of allFiles) {
  if (!/torp/i.test(filePath)) continue;
  if (SKIP_EXT.has(path.extname(filePath).toLowerCase())) continue;
  try {
    const next = renamePathIfNeeded(filePath);
    if (next !== filePath) renamedFiles += 1;
  } catch (e) {
    console.warn("[rename] skip", filePath, e.message);
  }
}

// Rename torp directory for Android Java package
const javaTorpDir = path.join(
  repoRoot,
  "web/android/app/src/main/java/org/theoutreachproject/torp",
);
const javaTopDir = path.join(
  repoRoot,
  "web/android/app/src/main/java/org/theoutreachproject/top",
);
if (fs.existsSync(javaTorpDir) && !fs.existsSync(javaTopDir)) {
  fs.renameSync(javaTorpDir, javaTopDir);
  renamedFiles += 1;
}

console.log(`[rename-torp-to-top] updated ${changedFiles} files, renamed ${renamedFiles} paths`);
