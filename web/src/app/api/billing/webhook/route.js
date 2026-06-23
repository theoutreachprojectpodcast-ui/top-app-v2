import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import Stripe from "stripe";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import {
  getProfileRowByStripeCustomerId,
  getProfileRowByWorkOSId,
  mergeProfileMetadataByWorkOSId,
} from "@/lib/profile/serverProfile";
import { notifyMembershipFromStripeInvoice } from "@/server/notifications/notificationService";
import {
  syncPaymentMethodSummaryOnly,
  syncProfileFromSubscription,
} from "@/lib/billing/stripeProfileSync";
import { stripeWebhookSecret } from "@/lib/billing/stripeConfig";
import { headers } from "next/headers";

export const runtime = "nodejs";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('stripe').Stripe} stripe
 * @param {import('stripe').Stripe.Subscription} sub
 * @param {string} customerId
 */
async function resolveWorkosUserId(admin, sub, customerId) {
  const meta = sub.metadata || {};
  const direct = meta.workos_user_id;
  if (direct) return String(direct);

  if (customerId) {
    const byCustomer = await getProfileRowByStripeCustomerId(admin, customerId);
    if (byCustomer?.workos_user_id) return String(byCustomer.workos_user_id);
  }

  const profileId = meta.top_profile_id || meta.torp_profile_id;
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

export async function POST(request) {
  const __guard = guardMutation(request, { rateKey: "billing-webhook", limit: 200, skipOriginCheck: true });
  if (!__guard.ok) return guardFailureResponse(__guard);
  const secret = stripeWebhookSecret();
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
    console.error("[top] Stripe webhook verify", err.message);
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
        const profileId = session.metadata?.top_profile_id || session.metadata?.torp_profile_id;

        if (cust && workos) {
          await admin
            .from(profileTableName())
            .update({ stripe_customer_id: cust, updated_at: new Date().toISOString() })
            .eq("workos_user_id", workos);
          if (session.mode === "setup") {
            await syncPaymentMethodSummaryOnly(admin, stripe, String(workos), cust);
          }
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
          const workosUserId = await resolveWorkosUserId(admin, sub, cust);
          if (workosUserId) {
            await syncProfileFromSubscription(admin, stripe, workosUserId, sub, {
              sponsorTierId: session.metadata?.sponsor_package_id || sub.metadata?.sponsor_package_id,
            });
          }
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
            if (pe) console.warn("[top] podcast checkout audit upsert", pe.message);
            const merge = await mergeProfileMetadataByWorkOSId(admin, String(w), {
              podcastSponsorLastTierId: String(session.metadata?.podcast_tier_id || ""),
              podcastSponsorLastCheckoutAt: new Date().toISOString(),
              podcastSponsorLastSessionId: session.id,
            });
            if (!merge.ok) console.warn("[top] podcast profile metadata merge", merge.reason);
            await admin
              .from(profileTableName())
              .update({
                sponsor_tier: String(session.metadata?.podcast_tier_id || ""),
                updated_at: new Date().toISOString(),
              })
              .eq("workos_user_id", String(w));
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const workosUserId = await resolveWorkosUserId(admin, sub, customerId);
        if (workosUserId) {
          await syncProfileFromSubscription(admin, stripe, workosUserId, sub, {
            sponsorTierId: sub.metadata?.sponsor_package_id,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const workosUserId = await resolveWorkosUserId(admin, sub, customerId);
        if (workosUserId) {
          await syncProfileFromSubscription(admin, stripe, workosUserId, sub, { forceEnded: true });
        }
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
          const workosUserId =
            profileForNotify?.workos_user_id || (await resolveWorkosUserId(admin, sub, customerId));
          if (workosUserId) {
            await syncProfileFromSubscription(admin, stripe, workosUserId, sub, {
              sponsorTierId: sub.metadata?.sponsor_package_id,
            });
          }
        }

        if (profileForNotify?.id) {
          try {
            await notifyMembershipFromStripeInvoice(admin, profileForNotify, inv, event.type);
          } catch (e) {
            console.warn("[top] membership notification", e?.message || e);
          }
        }
        break;
      }
      case "payment_method.attached": {
        const pm = event.data.object;
        const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
        if (!customerId) break;
        const profile = await getProfileRowByStripeCustomerId(admin, customerId);
        if (profile?.workos_user_id) {
          await syncPaymentMethodSummaryOnly(admin, stripe, String(profile.workos_user_id), customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[top] webhook handler", e);
    return Response.json({ error: "handler_failed", type: event?.type || "unknown" }, { status: 500 });
  }

  return Response.json({ received: true });
}
