import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, profileRowToClientDto } from "@/lib/profile/serverProfile";
import { stripeSecretConfigured } from "@/lib/billing/stripeConfig";
import { tierFromProfileRow } from "@/lib/billing/stripeProfileSync";
import { getMembershipTierDefinition, normalizeMembershipTierKey } from "@/features/membership/membershipTiers";

export async function GET(request) {
  const guard = guardMutation(request, { rateKey: "billing-summary", limit: 60 });
  if (!guard.ok) return guardFailureResponse(guard);
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const row = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (!row) {
    return Response.json({ error: "profile_required" }, { status: 403 });
  }

  const dto = profileRowToClientDto(row);
  const tierKey = normalizeMembershipTierKey(tierFromProfileRow(row));
  const tierDef = getMembershipTierDefinition(tierKey);

  let subscription = null;
  if (stripeSecretConfigured() && row.stripe_subscription_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.retrieve(String(row.stripe_subscription_id));
      subscription = {
        id: sub.id,
        status: sub.status,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
      };
    } catch {
      subscription = null;
    }
  }

  return Response.json({
    membership: {
      tier: tierFromProfileRow(row),
      tierLabel: tierDef.label,
      membershipStatus: row.membership_status,
      billingStatus: row.billing_status || row.membership_status,
      membershipSource: row.membership_source,
      renewalDate: row.renewal_date || subscription?.currentPeriodEnd || null,
      sponsorTier: row.sponsor_tier || null,
      subscriptionStatus: subscription?.status || (row.stripe_subscription_id ? "unknown" : "none"),
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      stripeCustomerIdSet: !!row.stripe_customer_id,
      stripeSubscriptionIdSet: !!row.stripe_subscription_id,
      paymentMethodSummary: dto.paymentMethodSummary || null,
    },
    profile: dto,
  });
}
