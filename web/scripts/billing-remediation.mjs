/**
 * Scan Stripe for Support $99/year mischarges and optionally issue $98.01 partial refunds + log results.
 *
 * Usage:
 *   node scripts/billing-remediation.mjs --scan
 *   node scripts/billing-remediation.mjs --apply-refunds --send-emails
 *   node scripts/billing-remediation.mjs --env-file .env.vercel.production --scan
 *
 * Requires STRIPE_SECRET_KEY. Supabase optional (for profile email lookup / remediation log).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INCORRECT_SUPPORT_ANNUAL_CENTS = 9900;
const SUPPORT_MEMBERSHIP_ANNUAL_CENTS = 99;
const SUPPORT_MISCHARGE_REFUND_CENTS = INCORRECT_SUPPORT_ANNUAL_CENTS - SUPPORT_MEMBERSHIP_ANNUAL_CENTS;
const HARDCODED_BLOCKED = ["price_1TlqQ9CiwOqAGcUDuZkKPlJ2"];
const REMEDIATION_EMAIL_SUBJECT = "Correction to Your Outreach Project Membership Charge";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const s = String(line || "").trim();
    if (!s || s.startsWith("#")) continue;
    const idx = s.indexOf("=");
    if (idx <= 0) continue;
    const key = s.slice(0, idx).trim();
    let value = s.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
if (envFileArg) {
  loadEnvFile(path.resolve(process.cwd(), envFileArg.slice("--env-file=".length)));
} else {
  loadEnvFile(path.join(__dirname, "../.env.local"));
}

const scanOnly = process.argv.includes("--scan") || (!process.argv.includes("--apply-refunds") && !process.argv.includes("--send-emails"));
const applyRefunds = process.argv.includes("--apply-refunds");
const sendEmails = process.argv.includes("--send-emails");

const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

function blockedIds() {
  const fromEnv = String(process.env.STRIPE_BLOCKED_PRICE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...HARDCODED_BLOCKED, ...fromEnv]);
}

async function stripe(method, pathname, params) {
  const init = {
    method,
    headers: { Authorization: `Bearer ${key}` },
  };
  if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(params);
  }
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, init);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "stripe_error");
  return data;
}

async function listMischargePriceIds() {
  const ids = blockedIds();
  const list = await stripe("GET", "prices?limit=100&active=true");
  for (const p of list.data || []) {
    if (
      p.recurring?.interval === "year" &&
      p.unit_amount === INCORRECT_SUPPORT_ANNUAL_CENTS &&
      p.currency === "usd"
    ) {
      ids.add(p.id);
    }
  }
  return [...ids];
}

async function buildAffectedRow(sub, priceId) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  let email = "";
  const workosUserId = String(sub.metadata?.workos_user_id || "").trim();

  if (customerId) {
    try {
      const customer = await stripe("GET", `customers/${customerId}`);
      if (customer && !customer.deleted) email = String(customer.email || "").trim();
    } catch {
      /* ignore */
    }
  }

  let paymentIntentId = "";
  let chargeId = "";
  let amountChargedCents = INCORRECT_SUPPORT_ANNUAL_CENTS;
  let chargeDate = sub.created ? new Date(sub.created * 1000).toISOString() : null;

  try {
    const inv = await stripe("GET", `invoices?subscription=${sub.id}&limit=1`);
    const first = inv.data?.[0];
    if (first) {
      amountChargedCents = first.amount_paid || first.total || amountChargedCents;
      chargeDate = first.status_transitions?.paid_at
        ? new Date(first.status_transitions.paid_at * 1000).toISOString()
        : chargeDate;
      paymentIntentId =
        typeof first.payment_intent === "string" ? first.payment_intent : first.payment_intent?.id || "";
      chargeId = typeof first.charge === "string" ? first.charge : first.charge?.id || "";

      if ((!paymentIntentId || !chargeId) && first.id) {
        const expanded = await stripe(
          "GET",
          `invoices/${first.id}?expand[]=payments.data.payment.payment_intent&expand[]=charge&expand[]=payment_intent`,
        );
        paymentIntentId =
          paymentIntentId ||
          (typeof expanded.payment_intent === "string"
            ? expanded.payment_intent
            : expanded.payment_intent?.id || "");
        chargeId =
          chargeId || (typeof expanded.charge === "string" ? expanded.charge : expanded.charge?.id || "");
        const nestedPi = expanded.payments?.data?.[0]?.payment?.payment_intent;
        if (!paymentIntentId && nestedPi) {
          paymentIntentId = typeof nestedPi === "string" ? nestedPi : nestedPi?.id || "";
        }
      }

      if (paymentIntentId && !chargeId) {
        const pi = await stripe("GET", `payment_intents/${paymentIntentId}`);
        chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || "";
      }
    }

    if (!paymentIntentId && !chargeId && customerId) {
      const charges = await stripe("GET", `charges?customer=${customerId}&limit=10`);
      const match = (charges.data || []).find((c) => c.amount === INCORRECT_SUPPORT_ANNUAL_CENTS && !c.refunded);
      if (match) chargeId = match.id;
    }
  } catch {
    /* ignore */
  }

  return {
    userEmail: email,
    workosUserId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePaymentIntentId: paymentIntentId,
    stripeChargeId: chargeId,
    incorrectPriceId: priceId,
    amountChargedCents,
    correctAmountCents: SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
    refundAmountCents: SUPPORT_MISCHARGE_REFUND_CENTS,
    chargeDate,
    subscriptionStatus: sub.status,
    membershipTier: "support",
  };
}

async function scanIncidents() {
  const badPriceIds = await listMischargePriceIds();
  const affected = [];
  const seen = new Set();

  for (const priceId of badPriceIds) {
    let startingAfter;
    for (;;) {
      const qs = new URLSearchParams({
        price: priceId,
        status: "all",
        limit: "100",
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      const page = await stripe("GET", `subscriptions?${qs}`);
      for (const sub of page.data || []) {
        if (seen.has(sub.id)) continue;
        seen.add(sub.id);
        affected.push(await buildAffectedRow(sub, priceId));
      }
      if (!page.has_more || !page.data?.length) break;
      startingAfter = page.data[page.data.length - 1].id;
    }
  }
  return { badPriceIds, affected, refundCents: SUPPORT_MISCHARGE_REFUND_CENTS };
}

async function issueRefund(row) {
  const amount = row.refundAmountCents ?? SUPPORT_MISCHARGE_REFUND_CENTS;
  const meta = { remediation: "support_mischarge_2026_06", tier: "support" };
  if (row.stripeChargeId) {
    const refund = await stripe("POST", "refunds", {
      charge: row.stripeChargeId,
      amount: String(amount),
      reason: "requested_by_customer",
      "metadata[remediation]": meta.remediation,
      "metadata[tier]": meta.tier,
    });
    return { ok: true, refundId: refund.id, status: refund.status };
  }
  if (row.stripePaymentIntentId) {
    const refund = await stripe("POST", "refunds", {
      payment_intent: row.stripePaymentIntentId,
      amount: String(amount),
      reason: "requested_by_customer",
      "metadata[remediation]": meta.remediation,
      "metadata[tier]": meta.tier,
    });
    return { ok: true, refundId: refund.id, status: refund.status };
  }
  return { ok: false, error: "no_charge_or_payment_intent" };
}

function remediationEmailHtml(firstName) {
  const name = String(firstName || "there").trim() || "there";
  return `<p>Hi ${name},</p>
<p>We identified a billing error that caused your Outreach Project Support Membership to be charged at $99/year instead of the correct $0.99/year price.</p>
<p>We have corrected the pricing issue and are processing a refund for the difference of $98.01. Your Support Membership will remain active, and no action is needed on your end.</p>
<p>We apologize for the mistake and appreciate your understanding.</p>
<p>The Outreach Project Team</p>`;
}

async function sendEmail(to, html) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.ADMIN_EMAIL_FROM || "").trim();
  if (!apiKey || !from) return { ok: false, error: "email_provider_not_configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject: REMEDIATION_EMAIL_SUBJECT, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message || "email_send_failed" };
  return { ok: true, id: data?.id || "" };
}

async function main() {
  console.log("[billing-remediation] Scanning Stripe for Support mischarge subscriptions…");
  const report = await scanIncidents();
  console.log(JSON.stringify({ badPriceIds: report.badPriceIds, count: report.affected.length, refundCents: report.refundCents }, null, 2));

  if (report.affected.length) {
    console.log("\nAffected users:");
    for (const row of report.affected) {
      console.log(
        [
          row.userEmail || "(no email)",
          row.workosUserId || "(no workos id)",
          row.stripeSubscriptionId,
          `$${(row.amountChargedCents / 100).toFixed(2)} charged`,
          `refund $${(row.refundAmountCents / 100).toFixed(2)}`,
          row.chargeDate || "",
        ].join(" | "),
      );
    }
  }

  if (scanOnly) {
    console.log("\n[billing-remediation] Scan only. Use --apply-refunds and/or --send-emails to remediate.");
    return;
  }

  for (const row of report.affected) {
    if (applyRefunds) {
      try {
        const refund = await issueRefund(row);
        if (refund.ok) {
          console.log(`REFUND OK ${row.stripeSubscriptionId} → ${refund.refundId} (${refund.status})`);
        } else {
          console.error(`REFUND FAIL ${row.stripeSubscriptionId}: ${refund.error}`);
        }
      } catch (e) {
        console.error(`REFUND FAIL ${row.stripeSubscriptionId}:`, e.message);
      }
    }
    if (sendEmails && row.userEmail) {
      const firstName = row.userEmail.split("@")[0] || "there";
      const sent = await sendEmail(row.userEmail, remediationEmailHtml(firstName));
      console.log(sent.ok ? `EMAIL OK ${row.userEmail}` : `EMAIL FAIL ${row.userEmail}: ${sent.error}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
