import { requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { recordBulkLicenseEvent } from "@/lib/bulkLicensing/events";
import Stripe from "stripe";

/**
 * Safe reconciliation: compare Stripe subscription state with local records.
 * Log-only by default; apply=true updates local status from Stripe (never invents paid state).
 */
export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-bulk-reconcile",
    limit: 10,
  });
  if (!ctx.ok) return ctx.response;

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || "").trim();
  const apply = body.apply === true;

  if (!organizationId) {
    return Response.json({ error: "organization_id_required" }, { status: 400 });
  }

  const { data: subs } = await ctx.admin
    .from("bulk_subscriptions")
    .select("*")
    .eq("organization_id", organizationId);

  const findings = [];
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const stripe = key ? new Stripe(key) : null;

  for (const sub of subs || []) {
    const { count: licenseCount } = await ctx.admin
      .from("bulk_individual_licenses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (Number(licenseCount || 0) > Number(sub.package_size || 0)) {
      findings.push({
        severity: "error",
        code: "licenses_exceed_package",
        detail: `licenses=${licenseCount} package=${sub.package_size}`,
      });
    }
    if (
      Number(licenseCount || 0) < Number(sub.package_size || 0) &&
      sub.subscription_status === "active"
    ) {
      findings.push({
        severity: "warning",
        code: "license_count_short",
        detail: `licenses=${licenseCount} package=${sub.package_size}`,
      });
    }

    if (!sub.stripe_subscription_id) {
      findings.push({ severity: "warning", code: "missing_stripe_subscription_id" });
      continue;
    }

    if (!stripe) {
      findings.push({ severity: "info", code: "stripe_unavailable_skip_remote" });
      continue;
    }

    try {
      const remote = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const localStatus = String(sub.subscription_status || "");
      const remoteMapped = remote.status === "trialing" ? "active" : remote.status;
      if (remoteMapped !== localStatus && remote.status !== localStatus) {
        findings.push({
          severity: "warning",
          code: "status_mismatch",
          detail: `local=${sub.subscription_status} stripe=${remote.status}`,
        });
        if (apply) {
          const { mapStripeSubStatus } = await import("@/lib/billing/stripeProfileSync");
          const { mapOrgStatus } = await import("@/lib/bulkLicensing/activateFromStripe");
          await ctx.admin
            .from("bulk_subscriptions")
            .update({
              subscription_status: mapStripeSubStatus(remote.status),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
          await ctx.admin
            .from("bulk_organizations")
            .update({
              status: mapOrgStatus(remote.status),
              updated_at: new Date().toISOString(),
            })
            .eq("id", organizationId);
          findings.push({ severity: "info", code: "status_synced_from_stripe" });
        }
      }
    } catch (e) {
      findings.push({
        severity: "error",
        code: "stripe_fetch_failed",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await recordBulkLicenseEvent(ctx.admin, {
    organizationId,
    eventType: "admin_override",
    actorUserId: ctx.user?.id,
    actorType: "admin",
    metadata: { action: "reconcile", apply, findingsCount: findings.length },
  });

  await writeAdminAuditLog(ctx.admin, request, {
    actorWorkosUserId: ctx.user?.id,
    action: "bulk_licensing_reconcile",
    resourceType: "bulk_organization",
    resourceId: organizationId,
    metadata: { apply, findings },
  });

  return Response.json({ ok: true, apply, findings });
}
