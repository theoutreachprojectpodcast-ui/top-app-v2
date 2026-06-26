/**
 * Record Support mischarge remediation in admin_audit_logs (works before billing_remediation_log migration).
 * Usage:
 *   cmd /c "vercel env run -e production -- node scripts/seed-billing-remediation-audit.mjs"
 */
import { createClient } from "@supabase/supabase-js";

function env(name) {
  return String(process.env[name] || "").replace(/[\r\n]+/g, "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const remediation = {
  action: "admin.billing.remediation.support_mischarge",
  resource_type: "billing_remediation",
  resource_id: "sub_1TmiBsCiwOqAGcUD7t7346eu",
  metadata: {
    userEmail: "andy@posefitness.io",
    workosUserId: "user_01KTA03VBHHVDMPJJCKVEX4GM8",
    stripeCustomerId: "cus_UmGjHwSwqGv2Mt",
    stripeSubscriptionId: "sub_1TmiBsCiwOqAGcUD7t7346eu",
    incorrectPriceId: "price_1TlqQ9CiwOqAGcUDuZkKPlJ2",
    amountChargedCents: 9900,
    correctAmountCents: 99,
    refundAmountCents: 9801,
    refundId: "pyr_1TmiKdCiwOqAGcUDRZvHrRBk",
    refundStatus: "refunded",
    emailStatus: "pending_resend_config",
    notes: "Support $99/yr mischarge hotfix 2026-06",
  },
};

const { data: existing } = await admin
  .from("admin_audit_logs")
  .select("id")
  .eq("action", remediation.action)
  .eq("resource_id", remediation.resource_id)
  .maybeSingle();

if (existing?.id) {
  console.log("[seed-billing-remediation-audit] audit row already exists:", existing.id);
  process.exit(0);
}

const { data, error } = await admin.from("admin_audit_logs").insert({
  actor_workos_user_id: "billing_hotfix_script",
  actor_email: "billing-hotfix@system",
  action: remediation.action,
  resource_type: remediation.resource_type,
  resource_id: remediation.resource_id,
  metadata: remediation.metadata,
}).select("id").single();

if (error) {
  console.error("[seed-billing-remediation-audit] insert failed:", error.message);
  process.exit(1);
}

console.log("[seed-billing-remediation-audit] recorded audit log:", data.id);
