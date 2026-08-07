import {
  requirePlatformAdminMutation,
  requirePlatformAdminRouteContext,
} from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import { revokeBulkLicense } from "@/lib/bulkLicensing/redeem";
import { recordBulkLicenseEvent } from "@/lib/bulkLicensing/events";
import { validateBusinessCode } from "@/lib/bulkLicensing/businessCode";
import { maskDisplayCode } from "@/lib/bulkLicensing/licenseCodes";

export async function GET(_request, context) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const orgId = String(params?.orgId || "").trim();

  const { data: org } = await ctx.admin
    .from("bulk_organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return Response.json({ error: "not_found" }, { status: 404 });

  const [{ data: members }, { data: subs }, { data: batches }, { data: licenses }, { data: events }, { data: webhooks }] =
    await Promise.all([
      ctx.admin.from("bulk_organization_members").select("*").eq("organization_id", orgId),
      ctx.admin
        .from("bulk_subscriptions")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      ctx.admin
        .from("bulk_license_batches")
        .select("*")
        .eq("organization_id", orgId)
        .order("term_start", { ascending: false }),
      ctx.admin
        .from("bulk_individual_licenses")
        .select("*")
        .eq("organization_id", orgId)
        .order("seat_number", { ascending: true })
        .limit(500),
      ctx.admin
        .from("bulk_license_events")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100),
      ctx.admin
        .from("bulk_stripe_webhook_events")
        .select(
          "stripe_event_id, event_type, processing_status, attempt_count, error_summary, processed_at, created_at",
        )
        .eq("related_organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return Response.json({
    organization: org,
    members: members || [],
    subscriptions: subs || [],
    batches: batches || [],
    licenses: (licenses || []).map((l) => ({
      ...l,
      display_code_masked: maskDisplayCode(l.display_code),
    })),
    events: events || [],
    webhooks: webhooks || [],
  });
}

export async function PATCH(request, context) {
  const ctx = await requirePlatformAdminMutation(request, {
    rateKey: "admin-bulk-licensing-patch",
    limit: 30,
  });
  if (!ctx.ok) return ctx.response;

  const params = await context.params;
  const orgId = String(params?.orgId || "").trim();
  const actorId = ctx.user?.id || null;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "update").trim();

  if (action === "revoke_license") {
    const result = await revokeBulkLicense(ctx.admin, {
      licenseId: String(body.licenseId || ""),
      actorUserId: actorId || "admin",
      actorType: "admin",
      reason: String(body.reason || "admin_revoke"),
    });
    await writeAdminAuditLog(ctx.admin, request, {
      actorWorkosUserId: actorId,
      action: "bulk_license_revoke",
      resourceType: "bulk_license",
      resourceId: String(body.licenseId || ""),
      metadata: { orgId, reason: body.reason },
    });
    return Response.json(result);
  }

  if (action === "correct_assigned_email") {
    const licenseId = String(body.licenseId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const { data: license } = await ctx.admin
      .from("bulk_individual_licenses")
      .select("*")
      .eq("id", licenseId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!license) return Response.json({ error: "not_found" }, { status: 404 });
    if (license.status === "redeemed") {
      return Response.json({ error: "already_redeemed" }, { status: 400 });
    }
    await ctx.admin
      .from("bulk_individual_licenses")
      .update({
        assigned_email: email || null,
        status: email ? "assigned" : "available",
        updated_at: new Date().toISOString(),
      })
      .eq("id", licenseId);
    await recordBulkLicenseEvent(ctx.admin, {
      organizationId: orgId,
      licenseId,
      eventType: "admin_override",
      actorUserId: actorId,
      actorType: "admin",
      metadata: { action: "correct_assigned_email", email },
    });
    return Response.json({ ok: true });
  }

  if (action === "update_business_code") {
    const { data: org } = await ctx.admin
      .from("bulk_organizations")
      .select("business_code_locked, id")
      .eq("id", orgId)
      .maybeSingle();
    if (!org) return Response.json({ error: "not_found" }, { status: 404 });
    const { count: redeemed } = await ctx.admin
      .from("bulk_individual_licenses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "redeemed");
    if (org.business_code_locked && Number(redeemed || 0) > 0) {
      return Response.json(
        {
          error: "business_code_locked",
          message: "Business code is locked after licenses have been redeemed.",
        },
        { status: 400 },
      );
    }
    const validated = validateBusinessCode(body.businessCode);
    if (!validated.ok) {
      return Response.json({ error: validated.error, message: validated.message }, { status: 400 });
    }
    await ctx.admin
      .from("bulk_organizations")
      .update({ business_code: validated.code, updated_at: new Date().toISOString() })
      .eq("id", orgId);
    await recordBulkLicenseEvent(ctx.admin, {
      organizationId: orgId,
      eventType: "admin_override",
      actorUserId: actorId,
      actorType: "admin",
      metadata: { action: "update_business_code", code: validated.code },
    });
    return Response.json({ ok: true, businessCode: validated.code });
  }

  if (action === "set_notes") {
    await ctx.admin
      .from("bulk_organizations")
      .update({
        internal_notes: String(body.notes || ""),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);
    return Response.json({ ok: true });
  }

  if (action === "transfer_ownership") {
    const newOwner = String(body.workosUserId || "").trim();
    if (!newOwner) return Response.json({ error: "workos_user_id_required" }, { status: 400 });
    await ctx.admin
      .from("bulk_organizations")
      .update({ primary_admin_user_id: newOwner, updated_at: new Date().toISOString() })
      .eq("id", orgId);
    await ctx.admin.from("bulk_organization_members").upsert(
      {
        organization_id: orgId,
        workos_user_id: newOwner,
        role: "owner",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,workos_user_id" },
    );
    await recordBulkLicenseEvent(ctx.admin, {
      organizationId: orgId,
      eventType: "admin_override",
      actorUserId: actorId,
      actorType: "admin",
      metadata: { action: "transfer_ownership", newOwner },
    });
    return Response.json({ ok: true });
  }

  const patch = {};
  if (body.name) patch.name = String(body.name).trim();
  if (body.billingEmail) patch.billing_email = String(body.billingEmail).trim().toLowerCase();
  if (body.phone !== undefined) patch.phone = String(body.phone || "").trim() || null;
  if (body.website !== undefined) patch.website = String(body.website || "").trim() || null;
  if (Object.keys(patch).length) {
    patch.updated_at = new Date().toISOString();
    await ctx.admin.from("bulk_organizations").update(patch).eq("id", orgId);
  }
  return Response.json({ ok: true });
}
