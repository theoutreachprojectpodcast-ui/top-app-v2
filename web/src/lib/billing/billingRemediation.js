/**
 * Scan Stripe for Support mischarge ($99/yr) and issue partial refunds ($98.01).
 * Used by admin API and CLI script.
 */
import {
  INCORRECT_SUPPORT_ANNUAL_CENTS,
  SUPPORT_MEMBERSHIP_ANNUAL_CENTS,
  SUPPORT_MISCHARGE_REFUND_CENTS,
  blockedMembershipPriceIds,
} from "@/lib/billing/membershipPricing";
import { profileTableName } from "@/lib/supabase/admin";

/** @param {import('stripe').Stripe} stripe */
export async function listMischargeCandidatePriceIds(stripe) {
  const ids = new Set(blockedMembershipPriceIds());
  try {
    const prices = await stripe.prices.list({ limit: 100, active: true });
    for (const p of prices.data || []) {
      if (
        p.recurring?.interval === "year" &&
        p.unit_amount === INCORRECT_SUPPORT_ANNUAL_CENTS &&
        p.currency === "usd"
      ) {
        ids.add(p.id);
      }
    }
  } catch {
    /* use blocklist only */
  }
  return [...ids];
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {import('@supabase/supabase-js').SupabaseClient} [admin]
 */
export async function scanSupportMischargeIncidents(stripe, admin) {
  const badPriceIds = await listMischargeCandidatePriceIds(stripe);
  const affected = [];
  const seenSubs = new Set();

  for (const priceId of badPriceIds) {
    let startingAfter;
    for (;;) {
      const page = await stripe.subscriptions.list({
        price: priceId,
        status: "all",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const sub of page.data || []) {
        if (seenSubs.has(sub.id)) continue;
        seenSubs.add(sub.id);
        const row = await buildAffectedRow(stripe, admin, sub, priceId);
        if (row) affected.push(row);
      }
      if (!page.has_more || !page.data?.length) break;
      startingAfter = page.data[page.data.length - 1].id;
    }
  }

  return { badPriceIds, affected, refundCents: SUPPORT_MISCHARGE_REFUND_CENTS };
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} admin
 * @param {import('stripe').Stripe.Subscription} sub
 * @param {string} priceId
 */
async function buildAffectedRow(stripe, admin, sub, priceId) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  let email = "";
  let workosUserId = String(sub.metadata?.workos_user_id || "").trim();

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        email = String(customer.email || "").trim();
      }
    } catch {
      /* ignore */
    }
  }

  if (admin && customerId && !workosUserId) {
    const { data } = await admin
      .from(profileTableName())
      .select("workos_user_id, email, membership_tier, billing_status")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.workos_user_id) workosUserId = String(data.workos_user_id);
    if (!email && data?.email) email = String(data.email);
  }

  let paymentIntentId = "";
  let chargeId = "";
  let amountChargedCents = INCORRECT_SUPPORT_ANNUAL_CENTS;
  let chargeDate = sub.created ? new Date(sub.created * 1000).toISOString() : null;

  try {
    const inv = await stripe.invoices.list({ subscription: sub.id, limit: 1, expand: ["data.payments"] });
    const first = inv.data?.[0];
    if (first) {
      amountChargedCents = first.amount_paid || first.total || amountChargedCents;
      chargeDate = first.status_transitions?.paid_at
        ? new Date(first.status_transitions.paid_at * 1000).toISOString()
        : chargeDate;
      paymentIntentId =
        typeof first.payment_intent === "string" ? first.payment_intent : first.payment_intent?.id || "";
      chargeId = typeof first.charge === "string" ? first.charge : first.charge?.id || "";

      if (!paymentIntentId && !chargeId && first.id) {
        const expanded = await stripe.invoices.retrieve(first.id, {
          expand: ["payments.data.payment.payment_intent", "charge", "payment_intent"],
        });
        paymentIntentId =
          typeof expanded.payment_intent === "string"
            ? expanded.payment_intent
            : expanded.payment_intent?.id || "";
        chargeId = typeof expanded.charge === "string" ? expanded.charge : expanded.charge?.id || "";

        const paymentRow = expanded.payments?.data?.[0];
        const nestedPi = paymentRow?.payment?.payment_intent;
        if (!paymentIntentId && nestedPi) {
          paymentIntentId = typeof nestedPi === "string" ? nestedPi : nestedPi?.id || "";
        }
      }

      if (paymentIntentId && !chargeId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || "";
      }
    }

    if (!paymentIntentId && !chargeId && customerId) {
      const charges = await stripe.charges.list({ customer: customerId, limit: 10 });
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
    refundStatus: "pending",
    refundId: null,
    refundError: null,
  };
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {{ stripeChargeId?: string, stripePaymentIntentId?: string, refundAmountCents?: number }} row
 */
export async function issueMischargePartialRefund(stripe, row) {
  const amount = row.refundAmountCents ?? SUPPORT_MISCHARGE_REFUND_CENTS;
  if (row.stripeChargeId) {
    const refund = await stripe.refunds.create({
      charge: row.stripeChargeId,
      amount,
      reason: "requested_by_customer",
      metadata: { remediation: "support_mischarge_2026_06", tier: "support" },
    });
    return { ok: true, refundId: refund.id, status: refund.status };
  }
  if (row.stripePaymentIntentId) {
    const refund = await stripe.refunds.create({
      payment_intent: row.stripePaymentIntentId,
      amount,
      reason: "requested_by_customer",
      metadata: { remediation: "support_mischarge_2026_06", tier: "support" },
    });
    return { ok: true, refundId: refund.id, status: refund.status };
  }
  return { ok: false, error: "no_charge_or_payment_intent" };
}

export const REMEDIATION_EMAIL_SUBJECT = "Correction to Your Outreach Project Membership Charge";

export function remediationEmailHtml(firstName = "there") {
  const name = String(firstName || "there").trim() || "there";
  return `<p>Hi ${name},</p>
<p>We identified a billing error that caused your Outreach Project Support Membership to be charged at $99/year instead of the correct $0.99/year price.</p>
<p>We have corrected the pricing issue and are processing a refund for the difference of $98.01. Your Support Membership will remain active, and no action is needed on your end.</p>
<p>We apologize for the mistake and appreciate your understanding.</p>
<p>The Outreach Project Team</p>`;
}
