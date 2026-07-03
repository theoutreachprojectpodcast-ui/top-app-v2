import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";
import { TIER_MRR_USD, forecastMembershipMrr, forecastSponsorRevenue, scenarioMultiplier } from "@/lib/admin/revenueForecast";
import {
  stripeMemberRecurringConfigured,
  stripeSecretConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

export const runtime = "nodejs";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const scenario = String(url.searchParams.get("scenario") || "expected");
  const mult = scenarioMultiplier(scenario);

  const { data: profiles } = await ctx.admin
    .from(profileTableName())
    .select("membership_tier, membership_status, billing_status, stripe_subscription_id, stripe_customer_id");

  const tierCounts = { support: 0, member: 0, sponsor: 0, free: 0 };
  let activeSubscriptions = 0;
  let failedPayments = 0;
  let canceled = 0;

  for (const row of profiles || []) {
    const tier = String(row.membership_tier || "free").toLowerCase();
    const billing = String(row.billing_status || row.membership_status || "").toLowerCase();
    if (tier === "support") tierCounts.support += 1;
    else if (tier === "member") tierCounts.member += 1;
    else if (tier === "sponsor") tierCounts.sponsor += 1;
    else tierCounts.free += 1;
    if (row.stripe_subscription_id) {
      if (billing === "active" || billing === "trialing") activeSubscriptions += 1;
      if (billing === "past_due" || billing === "incomplete") failedPayments += 1;
      if (billing === "canceled") canceled += 1;
    }
  }

  const mrr = (tierCounts.support * TIER_MRR_USD.support + tierCounts.member * TIER_MRR_USD.member) * mult;
  const arr = mrr * 12;

  const [{ count: sponsorsActive }, { count: sponsorApps }, { data: billingRows }] = await Promise.all([
    ctx.admin.from("sponsors_catalog").select("*", { count: "exact", head: true }).eq("is_active", true),
    ctx.admin.from("sponsor_applications").select("*", { count: "exact", head: true }),
    ctx.admin.from("billing_records").select("id, amount_cents, status, reason, created_at, recipient_email").order("created_at", { ascending: false }).limit(50),
  ]);

  const assumptions = {
    monthlyMemberGrowth: parseFloat(url.searchParams.get("memberGrowth") || "3"),
    monthlyChurnPct: parseFloat(url.searchParams.get("churn") || "2"),
    sponsorGrowthPct: parseFloat(url.searchParams.get("sponsorGrowth") || "5"),
    months: 12,
  };

  const membershipForecast = forecastMembershipMrr(
    { support: tierCounts.support, pro: tierCounts.member, sponsor: tierCounts.sponsor },
    assumptions,
  ).map((p) => ({ ...p, mrr: Math.round(p.mrr * mult * 100) / 100 }));

  const sponsorForecast = forecastSponsorRevenue(
    { existingSponsors: sponsorsActive || 0, pipeline: sponsorApps || 0, avgDealUsd: 500 },
    assumptions,
  ).map((p) => ({ ...p, revenue: Math.round(p.revenue * mult) }));

  return Response.json({
    ok: true,
    disclaimer:
      "Forecasts use configurable assumptions and profile-tier estimates. Not GAAP financial statements. Verify revenue in Stripe Dashboard.",
    scenario,
    revenue: {
      mrrUsd: Math.round(mrr * 100) / 100,
      arrUsd: Math.round(arr * 100) / 100,
      byTier: tierCounts,
    },
    subscriptions: {
      active: activeSubscriptions,
      failed: failedPayments,
      canceled,
      withStripeCustomer: (profiles || []).filter((p) => p.stripe_customer_id).length,
    },
    transactions: (billingRows || []).map((r) => ({
      id: r.id,
      amountUsd: ((r.amount_cents || 0) / 100).toFixed(2),
      status: r.status,
      reason: r.reason,
      recipient: r.recipient_email,
      createdAt: r.created_at,
    })),
    forecasts: {
      membership: membershipForecast,
      sponsors: sponsorForecast,
      assumptions,
    },
    stripeIntegration: {
      secretConfigured: stripeSecretConfigured(),
      memberRecurring: stripeMemberRecurringConfigured(),
      webhook: stripeWebhookConfigured(),
      capabilities: ["checkout", "portal", "webhook", "podcast-sponsor-checkout"],
    },
  });
}
