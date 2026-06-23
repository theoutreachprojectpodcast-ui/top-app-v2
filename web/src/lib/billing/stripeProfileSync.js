import { resolvePlatformRoleAfterTierChange } from "@/lib/account/accountModel";
import { checkoutTierToDb, normalizeDbMembershipTier } from "@/lib/billing/membershipTierOrder";
import { profileTableName } from "@/lib/supabase/admin";

export function mapStripeSubStatus(status) {
  const statusMap = {
    active: "active",
    trialing: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "past_due",
  };
  return statusMap[status] || "pending";
}

/**
 * Build masked payment method summary from Stripe PaymentMethod.
 * @param {import('stripe').Stripe.PaymentMethod | null} pm
 */
export function paymentMethodToSummary(pm) {
  if (!pm?.card) return null;
  return {
    brand: pm.card.brand || "",
    last4: pm.card.last4 || "",
    expMonth: pm.card.exp_month ?? null,
    expYear: pm.card.exp_year ?? null,
    funding: pm.card.funding || "",
  };
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {string} customerId
 */
export async function fetchDefaultPaymentMethodSummary(stripe, customerId) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return null;
    const dpm = customer.invoice_settings?.default_payment_method;
    if (dpm && typeof dpm === "object" && !dpm.deleted) {
      return paymentMethodToSummary(dpm);
    }
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    return paymentMethodToSummary(pms.data[0] || null);
  } catch {
    return null;
  }
}

/**
 * Sync top_profiles billing columns from a Stripe subscription.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe} stripe
 * @param {string} workosUserId
 * @param {import('stripe').Stripe.Subscription} sub
 * @param {{ forceEnded?: boolean, sponsorTierId?: string }} opts
 */
export async function syncProfileFromSubscription(admin, stripe, workosUserId, sub, opts = {}) {
  const table = profileTableName();
  const cust = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const ended = opts.forceEnded || sub.status === "canceled" || sub.status === "incomplete_expired";

  const { data: existing } = await admin.from(table).select("*").eq("workos_user_id", workosUserId).maybeSingle();

  let pmSummary = existing?.payment_method_summary;
  if (cust && stripe) {
    const fresh = await fetchDefaultPaymentMethodSummary(stripe, cust);
    if (fresh) pmSummary = fresh;
  }

  if (ended) {
    const patch = {
      membership_tier: "free",
      membership_status: "canceled",
      billing_status: "canceled",
      stripe_subscription_id: null,
      membership_source: "stripe",
      renewal_date: null,
      sponsor_tier: null,
      platform_role: resolvePlatformRoleAfterTierChange(existing?.platform_role, "free"),
      payment_method_summary: pmSummary || existing?.payment_method_summary || {},
      updated_at: new Date().toISOString(),
    };
    if (cust) patch.stripe_customer_id = cust;
    await admin.from(table).update(patch).eq("workos_user_id", workosUserId);
    return;
  }

  const metaTier = String(sub.metadata?.membership_tier || "member").toLowerCase();
  const safeTier = checkoutTierToDb(metaTier);
  const billingStatus = mapStripeSubStatus(sub.status);
  const renewal = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  const sponsorTier =
    opts.sponsorTierId ||
    (sub.metadata?.sponsor_package_id ? String(sub.metadata.sponsor_package_id) : null) ||
    existing?.sponsor_tier ||
    null;

  const patch = {
    stripe_customer_id: cust || undefined,
    stripe_subscription_id: sub.id,
    membership_tier: safeTier,
    membership_status: billingStatus,
    billing_status: billingStatus,
    membership_source: "stripe",
    renewal_date: renewal,
    sponsor_tier: safeTier === "sponsor" ? sponsorTier : null,
    platform_role: resolvePlatformRoleAfterTierChange(existing?.platform_role, safeTier),
    payment_method_summary: pmSummary || {},
    updated_at: new Date().toISOString(),
  };

  await admin.from(table).update(patch).eq("workos_user_id", workosUserId);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} workosUserId
 */
export async function syncPaymentMethodSummaryOnly(admin, stripe, workosUserId, customerId) {
  const summary = await fetchDefaultPaymentMethodSummary(stripe, customerId);
  if (!summary) return;
  await admin
    .from(profileTableName())
    .update({
      payment_method_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("workos_user_id", workosUserId);
}

export function tierFromProfileRow(row) {
  return normalizeDbMembershipTier(row?.membership_tier);
}
