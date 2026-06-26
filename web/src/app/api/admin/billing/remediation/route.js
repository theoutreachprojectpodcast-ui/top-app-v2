import { z } from "zod";
import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { parseJsonBody, validationFailureResponse } from "@/lib/security/secureRoute";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripeSecretConfigured } from "@/lib/billing/stripeConfig";
import {
  issueMischargePartialRefund,
  remediationEmailHtml,
  REMEDIATION_EMAIL_SUBJECT,
  scanSupportMischargeIncidents,
} from "@/lib/billing/billingRemediation";
import { sendResendNotificationEmail } from "@/server/email/sendResendNotificationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const remediationActionSchema = z.object({
  applyRefunds: z.boolean().optional().default(false),
  sendEmails: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(true),
});

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;
  if (!stripeSecretConfigured()) {
    return Response.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const admin = createSupabaseAdminClient();
  const report = await scanSupportMischargeIncidents(stripe, admin);

  const { data: logs } = admin
    ? await admin
        .from("billing_remediation_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return Response.json({
    ok: true,
    ...report,
    count: report.affected.length,
    priorLogs: logs || [],
  });
}

export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, { rateKey: "admin-billing-remediation" });
  if (!ctx.ok) return ctx.response;
  if (!stripeSecretConfigured()) {
    return Response.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }

  const parsed = await parseJsonBody(request, remediationActionSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);
  let { applyRefunds, sendEmails, dryRun } = parsed.data;
  if (applyRefunds) dryRun = false;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const admin = createSupabaseAdminClient();
  const report = await scanSupportMischargeIncidents(stripe, admin);

  const results = [];

  for (const row of report.affected) {
    const entry = { ...row, refundStatus: "skipped", emailStatus: "skipped" };

    if (dryRun && !applyRefunds) {
      entry.refundStatus = "dry_run";
      results.push(entry);
      continue;
    }

    if (applyRefunds) {
      try {
        const refund = await issueMischargePartialRefund(stripe, row);
        if (refund.ok) {
          entry.refundStatus = refund.status || "refunded";
          entry.refundId = refund.refundId;
        } else {
          entry.refundStatus = "failed";
          entry.refundError = refund.error || "refund_failed";
        }
      } catch (e) {
        entry.refundStatus = "failed";
        entry.refundError = e instanceof Error ? e.message : String(e);
        console.error("[top] remediation refund failed", row.stripeSubscriptionId, e);
      }
    }

    if (sendEmails && row.userEmail) {
      const firstName = row.userEmail.split("@")[0] || "there";
      const sent = await sendResendNotificationEmail({
        to: row.userEmail,
        subject: REMEDIATION_EMAIL_SUBJECT,
        html: remediationEmailHtml(firstName),
      });
      entry.emailStatus = sent.ok ? "sent" : "failed";
      if (!sent.ok) entry.emailError = sent.error;
    }

    if (admin) {
      await admin.from("billing_remediation_log").insert({
        workos_user_id: row.workosUserId || "",
        recipient_email: row.userEmail || "",
        stripe_customer_id: row.stripeCustomerId || "",
        stripe_subscription_id: row.stripeSubscriptionId || "",
        stripe_charge_id: row.stripeChargeId || "",
        stripe_payment_intent_id: row.stripePaymentIntentId || "",
        incorrect_price_id: row.incorrectPriceId || "",
        amount_charged_cents: row.amountChargedCents,
        refund_amount_cents: row.refundAmountCents,
        refund_status: entry.refundStatus,
        refund_id: entry.refundId || null,
        refund_error: entry.refundError || null,
        email_status: entry.emailStatus,
        notes: dryRun ? "dry_run" : applyRefunds ? "refund_applied" : "scan_only",
        created_by: ctx.user?.id || "",
      });
    }

    results.push(entry);
  }

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: "admin.billing.remediation",
    resourceType: "billing_remediation",
    resourceId: null,
    metadata: { dryRun, applyRefunds, sendEmails, count: results.length },
  });

  return Response.json({
    ok: true,
    dryRun: dryRun && !applyRefunds,
    badPriceIds: report.badPriceIds,
    results,
  });
}
