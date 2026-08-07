import {
  requirePlatformAdminMutation,
  requirePlatformAdminRouteContext,
} from "@/lib/admin/adminRouteContext";

export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const q = String(new URL(request.url).searchParams.get("q") || "").trim();
  let query = ctx.admin
    .from("bulk_organizations")
    .select(
      "id, name, business_code, status, purchaser_email, billing_email, primary_admin_user_id, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,business_code.ilike.%${q}%,purchaser_email.ilike.%${q}%,billing_email.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const orgs = data || [];
  const ids = orgs.map((o) => o.id);
  /** @type {Record<string, unknown>} */
  const subsByOrg = {};
  if (ids.length) {
    const { data: subs } = await ctx.admin
      .from("bulk_subscriptions")
      .select(
        "organization_id, package_size, subscription_status, stripe_subscription_id, stripe_customer_id, current_period_end",
      )
      .in("organization_id", ids);
    for (const s of subs || []) {
      if (!subsByOrg[s.organization_id]) subsByOrg[s.organization_id] = s;
    }
  }

  return Response.json({
    organizations: orgs.map((o) => ({
      ...o,
      subscription: subsByOrg[o.id] || null,
    })),
  });
}

export async function POST(request) {
  // Keep mutation entry for future create-from-admin; currently unused
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-bulk-licensing-post",
    limit: 20,
  });
  if (!ctx.ok) return ctx.response;
  return Response.json({ error: "not_implemented" }, { status: 405 });
}
