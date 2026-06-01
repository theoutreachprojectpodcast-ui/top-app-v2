import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const table = profileTableName();
  const { data, error } = await ctx.admin
    .from(table)
    .select("membership_tier, membership_status, billing_status, stripe_subscription_id");

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const stats = {
    totalMembers: rows.length,
    freeMembers: 0,
    supportMembers: 0,
    proMembers: 0,
    sponsorMembers: 0,
    activeSubscriptions: 0,
    canceledSubscriptions: 0,
    pastDueOrFailed: 0,
  };

  for (const row of rows) {
    const tier = String(row.membership_tier || "free").toLowerCase();
    const status = String(row.billing_status || row.membership_status || "none").toLowerCase();
    if (tier === "free" || tier === "none") stats.freeMembers += 1;
    else if (tier === "support") stats.supportMembers += 1;
    else if (tier === "member") stats.proMembers += 1;
    else if (tier === "sponsor") stats.sponsorMembers += 1;

    if (row.stripe_subscription_id) {
      if (status === "canceled") stats.canceledSubscriptions += 1;
      else if (status === "active" || status === "trialing") stats.activeSubscriptions += 1;
      else if (status === "past_due" || status === "incomplete") stats.pastDueOrFailed += 1;
    }
  }

  return Response.json({ ok: true, stats });
}
