/**
 * Apply billing_remediation_log SQL using Supabase service role + postgres pooler when possible.
 * Usage:
 *   cmd /c "vercel env run -e production -- node scripts/apply-billing-remediation-log.mjs --apply"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(webRoot, "supabase/billing_remediation_log_2026_06.sql");
const apply = process.argv.includes("--apply");

function env(name) {
  return String(process.env[name] || "").replace(/[\r\n]+/g, "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const databaseUrl = env("DATABASE_URL") || env("SUPABASE_DB_URL");

async function probeTable(admin) {
  const { error } = await admin.from("billing_remediation_log").select("id").limit(1);
  if (!error) {
    console.log("[apply-billing-remediation-log] billing_remediation_log: OK");
    return true;
  }
  console.log(`[apply-billing-remediation-log] billing_remediation_log: MISSING (${error.message})`);
  return false;
}

async function applySqlPostgres() {
  if (!databaseUrl) return false;
  const sql = fs.readFileSync(sqlPath, "utf8");
  const { default: postgres } = await import("postgres");
  const sqlClient = postgres(databaseUrl, { max: 1 });
  try {
    await sqlClient.unsafe(sql);
    console.log("[apply-billing-remediation-log] SQL applied via DATABASE_URL");
    return true;
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

async function applySqlPooler() {
  if (!url || !serviceKey) return false;
  const ref = url.replace(/^https:\/\//, "").split(".")[0];
  const candidates = [
    `postgresql://postgres.${ref}:${encodeURIComponent(serviceKey)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(serviceKey)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(serviceKey)}@db.${ref}.supabase.co:5432/postgres`,
  ];
  const sql = fs.readFileSync(sqlPath, "utf8");
  let postgres;
  try {
    ({ default: postgres } = await import("postgres"));
  } catch {
    console.log("[apply-billing-remediation-log] postgres package not installed — pnpm add -D postgres");
    return false;
  }
  for (const conn of candidates) {
    try {
      const sqlClient = postgres(conn, { max: 1, connect_timeout: 8 });
      await sqlClient.unsafe(sql);
      await sqlClient.end({ timeout: 5 });
      console.log("[apply-billing-remediation-log] SQL applied via Supabase pooler");
      return true;
    } catch (e) {
      console.log(`[apply-billing-remediation-log] pooler attempt failed: ${e.message?.slice(0, 120)}`);
    }
  }
  return false;
}

async function seedRemediationLog(admin) {
  const { data: existing } = await admin
    .from("billing_remediation_log")
    .select("id")
    .eq("stripe_subscription_id", "sub_1TmiBsCiwOqAGcUD7t7346eu")
    .maybeSingle();
  if (existing?.id) {
    console.log("[apply-billing-remediation-log] remediation log row already exists");
    return true;
  }
  const { error } = await admin.from("billing_remediation_log").insert({
    workos_user_id: "user_01KTA03VBHHVDMPJJCKVEX4GM8",
    recipient_email: "andy@posefitness.io",
    stripe_customer_id: "cus_UmGjHwSwqGv2Mt",
    stripe_subscription_id: "sub_1TmiBsCiwOqAGcUD7t7346eu",
    incorrect_price_id: "price_1TlqQ9CiwOqAGcUDuZkKPlJ2",
    amount_charged_cents: 9900,
    refund_amount_cents: 9801,
    refund_status: "refunded",
    refund_id: "pyr_1TmiKdCiwOqAGcUDRZvHrRBk",
    email_status: "pending",
    notes: "support_mischarge_2026_06_hotfix",
    created_by: "apply-billing-remediation-log",
  });
  if (error) {
    console.error("[apply-billing-remediation-log] seed failed:", error.message);
    return false;
  }
  console.log("[apply-billing-remediation-log] Recorded remediation log for andy@posefitness.io");
  return true;
}

async function main() {
  if (!url || !serviceKey) {
    console.error("[apply-billing-remediation-log] Missing Supabase URL or service role key");
    process.exit(1);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let exists = await probeTable(admin);

  if (!exists && apply) {
    let applied = await applySqlPostgres();
    if (!applied) applied = await applySqlPooler();
    if (!applied) {
      console.log("\n[apply-billing-remediation-log] Manual step required:");
      console.log("  Supabase Dashboard → SQL Editor → paste:");
      console.log(`  ${sqlPath}`);
      console.log("  https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new");
      process.exit(1);
    }
    exists = await probeTable(admin);
  }

  if (exists && apply) {
    await seedRemediationLog(admin);
  }

  if (!exists && !apply) {
    console.log("\n[apply-billing-remediation-log] Run with --apply (via vercel env run -e production)");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
