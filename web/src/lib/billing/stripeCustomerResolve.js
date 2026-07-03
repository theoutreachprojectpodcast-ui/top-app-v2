import { profileTableName } from "@/lib/supabase/admin";

/**
 * Resolve Stripe customer id for a profile: use stored id, recover from subscription, or create.
 * Persists `stripe_customer_id` on `top_profiles` when recovered or created.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe} stripe
 * @param {{ id: string, email?: string | null }} user — WorkOS user
 * @param {Record<string, unknown>} row — `top_profiles` row
 * @returns {Promise<{ ok: true, customerId: string } | { ok: false, error: string, message?: string }>}
 */
export async function resolveStripeCustomerForProfile(admin, stripe, user, row) {
  if (!admin || !stripe || !user?.id || !row) {
    return { ok: false, error: "invalid", message: "Billing could not be loaded." };
  }

  let customerId = row.stripe_customer_id ? String(row.stripe_customer_id).trim() : "";

  if (!customerId && row.stripe_subscription_id) {
    const subId = String(row.stripe_subscription_id).trim();
    if (subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const cust = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
        if (cust) {
          customerId = cust;
          await admin
            .from(profileTableName())
            .update({ stripe_customer_id: cust, updated_at: new Date().toISOString() })
            .eq("workos_user_id", user.id);
        }
      } catch (e) {
        console.error("[top] resolveStripeCustomer from subscription", e);
      }
    }
  }

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: String(user.email || row.email || "").trim() || undefined,
        name:
          String(row.display_name || "").trim() ||
          [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
          undefined,
        metadata: {
          workos_user_id: user.id,
          top_profile_id: row.id ? String(row.id) : "",
        },
      });
      customerId = customer.id;
      await admin
        .from(profileTableName())
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("workos_user_id", user.id);
    } catch (e) {
      console.error("[top] resolveStripeCustomer create", e);
      return {
        ok: false,
        error: "stripe_error",
        message: e?.message || "Could not open billing portal.",
      };
    }
  }

  return { ok: true, customerId };
}
