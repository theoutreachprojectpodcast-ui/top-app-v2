import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import {
  getMembershipConfiguration,
  updateMembershipConfiguration,
  MEMBERSHIP_CONFIG_AUDIT_TABLE,
} from "@/lib/membership/membershipConfiguration";
import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const cfg = await getMembershipConfiguration(ctx.admin, { bypassCache: true });

  let supportReport = {
    totalSupportProfiles: 0,
    activeSupportSubscriptions: 0,
    canceledSupportSubscriptions: 0,
    pastDueSupportSubscriptions: 0,
    upgradedToPro: 0,
  };

  try {
    const table = profileTableName();
    const { data: rows } = await ctx.admin
      .from(table)
      .select("membership_tier, membership_status, billing_status, stripe_subscription_id")
      .in("membership_tier", ["support", "access"]);

    const list = Array.isArray(rows) ? rows : [];
    supportReport.totalSupportProfiles = list.length;
    for (const row of list) {
      const st = String(row.billing_status || row.membership_status || "").toLowerCase();
      if (st === "active" || st === "trialing") supportReport.activeSupportSubscriptions += 1;
      else if (st === "canceled" || st === "cancelled") supportReport.canceledSupportSubscriptions += 1;
      else if (st === "past_due" || st === "unpaid") supportReport.pastDueSupportSubscriptions += 1;
    }

    const { count } = await ctx.admin
      .from(table)
      .select("workos_user_id", { count: "exact", head: true })
      .eq("membership_tier", "member");
    supportReport.upgradedToPro = typeof count === "number" ? count : 0;
  } catch {
    /* profiles table shape may vary */
  }

  let audit = [];
  try {
    const { data } = await ctx.admin
      .from(MEMBERSHIP_CONFIG_AUDIT_TABLE)
      .select("id, action, previous_value, new_value, actor_email, environment, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    audit = Array.isArray(data) ? data : [];
  } catch {
    audit = [];
  }

  return Response.json({
    ok: true,
    configuration: cfg,
    supportReport,
    audit,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
  });
}

export async function PATCH(request) {
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-membership-plan-availability",
    limit: 20,
  });
  if (!ctx.ok) return ctx.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.supportMembershipEnabled !== "boolean") {
    return Response.json(
      { ok: false, error: "supportMembershipEnabled_required", message: "Pass supportMembershipEnabled as a boolean." },
      { status: 400 },
    );
  }

  if (body.confirm !== true) {
    return Response.json(
      {
        ok: false,
        error: "confirmation_required",
        message: "Set confirm: true after reviewing the enable/disable consequences.",
      },
      { status: 400 },
    );
  }

  // When enabling Support, require a configured Stripe Support price.
  if (body.supportMembershipEnabled === true) {
    const { supportSubscriptionPriceId } = await import("@/lib/billing/stripeConfig");
    const priceId = supportSubscriptionPriceId();
    if (!priceId) {
      return Response.json(
        {
          ok: false,
          error: "support_price_not_configured",
          message:
            "Cannot enable Support Membership without STRIPE_PRICE_SUPPORT_YEARLY (or ANNUAL) configured and validated.",
        },
        { status: 400 },
      );
    }
  }

  const previous = await getMembershipConfiguration(ctx.admin, { bypassCache: true });
  const next = await updateMembershipConfiguration(ctx.admin, {
    supportMembershipEnabled: body.supportMembershipEnabled,
    reason: String(body.reason || "").trim() || null,
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    requestMeta: {
      route: "admin/membership/plan-availability",
    },
  });

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: String(ctx.user?.id || ""),
    actorEmail: String(ctx.user?.email || ""),
    action: body.supportMembershipEnabled
      ? "admin.membership.support.enabled"
      : "admin.membership.support.disabled",
    resourceType: "membership_plan_configuration",
    resourceId: "default",
    metadata: {
      previous: previous.supportMembershipEnabled,
      next: next.supportMembershipEnabled,
      reason: body.reason || null,
    },
  });

  return Response.json({ ok: true, configuration: next });
}
