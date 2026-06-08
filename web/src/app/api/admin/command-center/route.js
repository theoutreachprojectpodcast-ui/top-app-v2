import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";
import { TIER_MRR_USD } from "@/lib/admin/revenueForecast";
import {
  stripeMemberRecurringConfigured,
  stripeSecretConfigured,
  stripeWebhookConfigured,
} from "@/lib/billing/stripeConfig";

export const runtime = "nodejs";

async function countRows(admin, table, filters = []) {
  let q = admin.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of filters) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

async function countIn(admin, table, column, values) {
  let q = admin.from(table).select("*", { count: "exact", head: true }).in(column, values);
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const pendingStatuses = ["pending_review", "submitted", "under_review", "in_review"];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    communityPending,
    communityDrafts,
    podcastApplications,
    sponsorsActive,
    trustedActive,
    usersTotal,
    usersNewWeek,
    sponsorAppsNew,
    billingRows,
    profiles,
  ] = await Promise.all([
    countIn(ctx.admin, "community_posts", "status", pendingStatuses),
    countIn(ctx.admin, "community_posts", "status", ["draft"]),
    countIn(ctx.admin, "podcast_guest_applications", "status", ["new", "submitted", "in_review"]),
    countRows(ctx.admin, "sponsors_catalog", [["is_active", true]]),
    countRows(ctx.admin, "trusted_resources", [["listing_status", "active"]]),
    countRows(ctx.admin, profileTableName()),
    ctx.admin
      .from(profileTableName())
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    countIn(ctx.admin, "sponsor_applications", "status", ["new"]),
    ctx.admin.from("billing_records").select("amount_cents, status, created_at").order("created_at", { ascending: false }).limit(20),
    ctx.admin.from(profileTableName()).select("membership_tier, membership_status, billing_status, stripe_subscription_id, created_at"),
  ]);

  let newUsersWeek = null;
  if (usersNewWeek && typeof usersNewWeek.count === "number") newUsersWeek = usersNewWeek.count;

  const tierCounts = { support: 0, member: 0, sponsor: 0, free: 0 };
  for (const row of profiles.data || []) {
    const tier = String(row.membership_tier || "free").toLowerCase();
    if (tier === "support") tierCounts.support += 1;
    else if (tier === "member") tierCounts.member += 1;
    else if (tier === "sponsor") tierCounts.sponsor += 1;
    else tierCounts.free += 1;
  }

  const estimatedMrr =
    tierCounts.support * TIER_MRR_USD.support + tierCounts.member * TIER_MRR_USD.member;

  const recentBilling = (billingRows.data || []).map((r) => ({
    id: r.id,
    amountUsd: ((r.amount_cents || 0) / 100).toFixed(2),
    status: r.status,
    createdAt: r.created_at,
  }));

  return Response.json({
    ok: true,
    queues: {
      communityPending,
      communityDrafts,
      podcastApplications,
      sponsorAppsNew,
    },
    snapshots: {
      sponsorsActive,
      trustedActive,
      usersTotal,
      usersNewWeek: newUsersWeek,
      estimatedMrrUsd: Math.round(estimatedMrr * 100) / 100,
      tierCounts,
    },
    stripe: {
      secretConfigured: stripeSecretConfigured(),
      memberRecurring: stripeMemberRecurringConfigured(),
      webhook: stripeWebhookConfigured(),
    },
    recentBilling,
    disclaimer:
      "Revenue figures are operational estimates from profile tiers and billing records—not audited financial statements.",
  });
}
