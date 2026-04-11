import Stripe from "stripe";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import {
  getProfileRowByStripeCustomerId,
  mergeProfileMetadataByWorkOSId,
} from "@/lib/profile/serverProfile";
import { notifyMembershipFromStripeInvoice } from "@/server/notifications/notificationService";
import { headers } from "next/headers";

export const runtime = "nodejs";

function mapStripeSubStatus(status) {
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
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe} stripe
 */
async function resolveWorkosUserId(admin, sub, customerId) {
  const meta = sub.metadata || {};
  const direct = meta.workos_user_id;
  if (direct) return String(direct);

  if (customerId) {
    const byCustomer = await getProfileRowByStripeCustomerId(admin, customerId);
    if (byCustomer?.workos_user_id) return String(byCustomer.workos_user_id);
  }

  const profileId = meta.torp_profile_id;
  if (profileId) {
    const { data, error } = await admin
      .from(profileTableName())
      .select("workos_user_id")
      .eq("id", profileId)
      .maybeSingle();
    if (!error && data?.workos_user_id) return String(data.workos_user_id);
  }

  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 */
async function syncSubscription(admin, sub, customerId, { forceEnded = false } = {}) {
  const cust = customerId || (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) || "";
  const workosUserId = await resolveWorkosUserId(admin, sub, cust);
  if (!workosUserId) {
    console.warn("[torp] webhook: could not resolve profile for subscription", sub.id);
    return;
  }

  const table = profileTableName();
  const ended = forceEnded || sub.status === "canceled" || sub.status === "incomplete_expired";

  if (ended) {
    const patch = {
      membership_tier: "free",
      membership_status: "canceled",
      stripe_subscription_id: null,
      membership_source: "manual",
      updated_at: new Date().toISOString(),
    };
    if (cust) patch.stripe_customer_id = cust;
    await admin.from(table).update(patch).eq("workos_user_id", workosUserId);
    return;
  }

  const tier = String(sub.metadata?.membership_tier || "member").toLowerCase();
  const safeTier = ["support", "member", "sponsor"].includes(tier) ? tier : "member";
  const billingStatus = mapStripeSubStatus(sub.status);

  const patch = {
    stripe_customer_id: cust || undefined,
    stripe_subscription_id: sub.id,
    membership_tier: safeTier,
    membership_status: billingStatus,
    membership_source: "stripe",
    updated_at: new Date().toISOString(),
  };

  await admin.from(table).update(patch).eq("workos_user_id", workosUserId);
}

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return Response.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const body = await request.text();
  const hdrs = await headers();
  const sig = hdrs.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = new Stripe(key);
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[torp] Stripe webhook verify", err.message);
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ received: true, synced: false });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const workos = session.metadata?.workos_user_id;
        const cust = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const profileId = session.metadata?.torp_profile_id;

        if (cust && workos) {
          await admin
            .from(profileTableName())
            .update({ stripe_customer_id: cust, updated_at: new Date().toISOString() })
            .eq("workos_user_id", workos);
        } else if (cust && profileId) {
          await admin
            .from(profileTableName())
            .update({ stripe_customer_id: cust, updated_at: new Date().toISOString() })
            .eq("id", profileId);
        }

        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(admin, sub, cust);
        }

        if (session.mode === "payment" && session.metadata?.checkout_kind === "podcast_sponsor") {
          const w = session.metadata?.workos_user_id;
          if (w && session.payment_status === "paid") {
            const { error: pe } = await admin.from("podcast_sponsor_checkout_events").upsert(
              {
                stripe_checkout_session_id: session.id,
                workos_user_id: String(w),
                podcast_tier_id: String(session.metadata?.podcast_tier_id || ""),
                payment_status: String(session.payment_status || "paid"),
                amount_total: session.amount_total ?? null,
                currency: session.currency ? String(session.currency) : null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "stripe_checkout_session_id" },
            );
            if (pe) console.warn("[torp] podcast checkout audit upsert", pe.message);
            const merge = await mergeProfileMetadataByWorkOSId(admin, String(w), {
              podcastSponsorLastTierId: String(session.metadata?.podcast_tier_id || ""),
              podcastSponsorLastCheckoutAt: new Date().toISOString(),
              podcastSponsorLastSessionId: session.id,
            });
            if (!merge.ok) console.warn("[torp] podcast profile metadata merge", merge.reason);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        await syncSubscription(admin, sub, customerId);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        await syncSubscription(admin, sub, customerId, { forceEnded: true });
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.upcoming": {
        const inv = event.data.object;
        const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        if (!subId) break;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const profileForNotify = customerId ? await getProfileRowByStripeCustomerId(admin, customerId) : null;

        if (event.type !== "invoice.upcoming") {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(admin, sub, customerId);
        }

        if (profileForNotify?.id) {
          try {
            await notifyMembershipFromStripeInvoice(admin, profileForNotify, inv, event.type);
          } catch (e) {
            console.warn("[torp] membership notification", e?.message || e);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[torp] webhook handler", e);
  }

  return Response.json({ received: true });
}
