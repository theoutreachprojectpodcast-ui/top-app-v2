import Stripe from "stripe";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { headers } from "next/headers";

export const runtime = "nodejs";

async function syncSubscription(admin, sub, customerId) {
  const meta = sub.metadata || {};
  const workosUserId = meta.workos_user_id;
  if (!workosUserId) return;

  const tier = String(meta.membership_tier || "member").toLowerCase();
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
  const billingStatus = statusMap[sub.status] || "pending";

  const patch = {
    stripe_customer_id: customerId || undefined,
    stripe_subscription_id: sub.id,
    membership_tier: ["support", "member", "sponsor"].includes(tier) ? tier : "member",
    membership_status: billingStatus,
    updated_at: new Date().toISOString(),
  };

  await admin.from(profileTableName()).update(patch).eq("workos_user_id", workosUserId);
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
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const cust = typeof session.customer === "string" ? session.customer : session.customer?.id;
          await syncSubscription(admin, sub, cust);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        await syncSubscription(admin, sub, customerId);
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
