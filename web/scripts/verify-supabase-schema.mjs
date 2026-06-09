/**
 * Verify Supabase schema against app expectations.
 * Usage: pnpm --dir web run verify:supabase
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(webRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "").trim();
const key = serviceKey || anonKey;
const usingAnon = !serviceKey && !!anonKey;

/** @type {Record<string, string[]>} */
const REQUIRED = {
  torp_profiles: [
    "workos_user_id",
    "email",
    "membership_tier",
    "membership_status",
    "membership_source",
    "stripe_customer_id",
    "stripe_subscription_id",
    "platform_role",
    "account_intent",
    "onboarding_status",
    "renewal_date",
    "billing_status",
    "sponsor_tier",
    "payment_method_summary",
    "phone_number",
    "postal_code",
    "preferred_contact_method",
    "notification_preferences",
    "identity_segment",
    "job_title",
    "reason_for_joining",
    "support_needs",
    "communities",
    "contribution_interests",
    "preferred_contribution_contact",
    "onboarding_skipped",
    "profile_completeness_percentage",
    "profile_completeness_missing_fields",
    "profile_last_updated_at",
    "account_setup_completed_at",
    "last_login_at",
    "user_type",
    "user_status",
    "admin_access_enabled",
    "permissions",
  ],
  top_qa_profiles: [
    "workos_user_id",
    "membership_tier",
    "membership_status",
    "platform_role",
    "account_intent",
    "onboarding_status",
    "renewal_date",
    "billing_status",
    "sponsor_tier",
    "payment_method_summary",
    "last_login_at",
    "phone_number",
    "postal_code",
    "preferred_contact_method",
    "notification_preferences",
    "identity_segment",
    "job_title",
    "onboarding_skipped",
    "profile_completeness_percentage",
    "user_type",
    "user_status",
    "admin_access_enabled",
  ],
  sponsors_catalog: ["slug", "name", "logo_url", "is_active"],
  sponsor_applications: ["company_name", "sponsor_slug", "sponsor_catalog_id"],
  trusted_resources: ["ein", "listing_status", "display_name"],
  community_posts: ["author_profile_id", "status", "visibility", "deleted_at"],
  nonprofit_directory_enrichment: ["ein", "logo_url", "header_image_url"],
  admin_settings: ["setting_key", "setting_value"],
  billing_records: ["workos_user_id", "status", "amount_cents"],
  page_content_blocks: ["page_key", "section_key", "status"],
  page_images: ["page_key", "section_key", "image_url"],
  podcast_episodes: ["youtube_video_id", "title"],
  podcast_episode_featured_guest: ["youtube_video_id"],
  admin_audit_logs: ["action", "resource_type"],
};

/** Tables probed with select head (may be views). */
const TABLE_PROBE = [
  "nonprofits_search_app_v1",
  "torp_profiles",
  "top_qa_profiles",
  "sponsors_catalog",
  "trusted_resources",
  "community_posts",
  "nonprofit_directory_enrichment",
  "admin_settings",
  "billing_records",
  "page_content_blocks",
  "page_images",
  "podcast_episodes",
  "podcast_episode_featured_guest",
  "admin_audit_logs",
  "sponsor_enrichment",
  "entity_social_links",
  "trusted_resource_nonprofit_links",
  "podcast_sponsor_checkout_events",
  "torp_platform_notifications",
  "top_app_saved_org_eins",
];

async function probeTable(admin, table) {
  const { error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (!error) return { ok: true };
  return { ok: false, message: error.message, code: error.code };
}

async function probeColumns(admin, table, columns) {
  const missing = [];
  for (const col of columns) {
    const { error } = await admin.from(table).select(col, { head: true });
    if (error) {
      const msg = error.message || "";
      if (/column|schema cache|Could not find/i.test(msg)) missing.push(col);
      else return { missing, fatal: msg };
    }
  }
  return { missing, fatal: null };
}

async function main() {
  if (!url || !key) {
    console.error("[verify:supabase] Missing NEXT_PUBLIC_SUPABASE_URL or Supabase API key");
    console.error("[verify:supabase] Set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`[verify:supabase] ${url}`);
  if (usingAnon) {
    console.warn("[verify:supabase] Using anon key — add SUPABASE_SERVICE_ROLE_KEY for authoritative checks\n");
  } else {
    console.log("[verify:supabase] Using service role key\n");
  }

  let errors = 0;
  let warnings = 0;

  for (const table of TABLE_PROBE) {
    const r = await probeTable(admin, table);
    if (r.ok) {
      console.log(`OK  table ${table}`);
    } else if (r.code === "PGRST205" || /Could not find the table|relation.*does not exist/i.test(r.message || "")) {
      console.log(`MISS table ${table} — ${r.message}`);
      if (REQUIRED[table]) errors += 1;
      else warnings += 1;
    } else {
      console.log(`ERR table ${table} — ${r.message}`);
      errors += 1;
    }
  }

  console.log("");
  for (const [table, cols] of Object.entries(REQUIRED)) {
    const exists = await probeTable(admin, table);
    if (!exists.ok) continue;
    const { missing, fatal } = await probeColumns(admin, table, cols);
    if (fatal) {
      console.log(`ERR columns ${table} — ${fatal}`);
      errors += 1;
      continue;
    }
    if (missing.length) {
      console.log(`MISS columns ${table}: ${missing.join(", ")}`);
      errors += missing.length;
    } else {
      console.log(`OK  columns ${table} (${cols.length} checked)`);
    }
  }

  console.log(`\n[verify:supabase] done — ${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) {
    console.log("\nFix: run web/supabase/supabase_schema_repair_2026_06.sql in Supabase SQL Editor,");
    console.log("      then apply any missing files from web/supabase/README_SETUP.md");
  }
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[verify:supabase]", err);
  process.exit(1);
});
