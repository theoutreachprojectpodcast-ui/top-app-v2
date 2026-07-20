import Stripe from "stripe";
import { requirePlatformAdminRouteContext, requirePlatformAdminMutation } from "@/lib/admin/adminRouteContext";
import { writeAdminAuditLog } from "@/lib/admin/adminAuditLog";
import {
  dryRunSupportToProMigration,
  executeSupportToProMigration,
  getSupportToProMigrationReport,
  verifySupportToProMigration,
  sendSupportToProMigrationEmail,
  MIGRATION_RECORDS_TABLE,
} from "@/lib/membership/supportToProMigration";
import { SUPPORT_TO_PRO_MIGRATION_VERSION } from "@/lib/membership/supportToProMigrationShared";

export const runtime = "nodejs";
export const maxDuration = 300;

function stripeClient() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return null;
  return new Stripe(key);
}

/** GET — migration report + optional live dry-run preview (?preview=1) */
export async function GET(request) {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";
  const verify = url.searchParams.get("verify") === "1";

  const report = await getSupportToProMigrationReport(ctx.admin);
  let dryRun = null;
  let verification = null;

  if (preview) {
    dryRun = await dryRunSupportToProMigration({
      admin: ctx.admin,
      stripe: stripeClient(),
    });
  }
  if (verify) {
    verification = await verifySupportToProMigration(ctx.admin);
  }

  return Response.json({
    ok: true,
    migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    report,
    dryRun,
    verification,
  });
}

/**
 * POST — dry-run or execute migration.
 * Body: { action: "dry_run" | "execute" | "retry_email", confirm?: true, workosUserIds?: string[], sendEmail?: boolean }
 */
export async function POST(request) {
  const ctx = await requirePlatformAdminMutation(request);
  if (!ctx.ok) return ctx.response;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  const stripe = stripeClient();

  if (action === "dry_run") {
    const dryRun = await dryRunSupportToProMigration({ admin: ctx.admin, stripe });
    // Persist preview rows as dry_run=true when tables exist
    await executeSupportToProMigration({
      admin: ctx.admin,
      stripe,
      dryRun: true,
      sendEmail: false,
    }).catch(() => null);

    await writeAdminAuditLog(ctx.admin, request, {
      actorEmail: String(ctx.user?.email || ""),
      actorWorkosUserId: String(ctx.user?.id || ""),
      action: "admin.membership.support_to_pro.dry_run",
      resourceType: "support_to_pro_migration",
      resourceId: SUPPORT_TO_PRO_MIGRATION_VERSION,
      metadata: { summary: dryRun.summary, migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION },
    });

    return Response.json({ ok: true, dryRun });
  }

  if (action === "execute") {
    if (body.confirm !== true) {
      return Response.json(
        {
          ok: false,
          error: "confirm_required",
          message:
            "Pass confirm: true to run the Support→Pro migration. This upgrades eligible Support members to complimentary Pro through their original paid period end. No new charges are created.",
        },
        { status: 400 },
      );
    }

    const result = await executeSupportToProMigration({
      admin: ctx.admin,
      stripe,
      dryRun: false,
      sendEmail: body.sendEmail !== false,
      workosUserIds: Array.isArray(body.workosUserIds) ? body.workosUserIds : undefined,
    });

    const verification = await verifySupportToProMigration(ctx.admin);

    await writeAdminAuditLog(ctx.admin, request, {
      actorEmail: String(ctx.user?.email || ""),
      actorWorkosUserId: String(ctx.user?.id || ""),
      action: "admin.membership.support_to_pro.execute",
      resourceType: "support_to_pro_migration",
      resourceId: SUPPORT_TO_PRO_MIGRATION_VERSION,
      metadata: {
        migrationVersion: SUPPORT_TO_PRO_MIGRATION_VERSION,
        migrated: result.migrated,
        emailsSent: result.emailsSent,
        emailsFailed: result.emailsFailed,
        stripeCancelsApplied: result.stripeCancelsApplied,
        errors: result.errors,
        verification,
      },
    });

    return Response.json({ ok: true, result, verification });
  }

  if (action === "retry_email") {
    const workosUserId = String(body.workosUserId || "").trim();
    if (!workosUserId) {
      return Response.json({ ok: false, error: "workosUserId_required" }, { status: 400 });
    }
    const { data: record } = await ctx.admin
      .from(MIGRATION_RECORDS_TABLE)
      .select("*")
      .eq("migration_version", SUPPORT_TO_PRO_MIGRATION_VERSION)
      .eq("workos_user_id", workosUserId)
      .maybeSingle();

    if (!record || record.status === "exception" || record.status === "skipped_expired") {
      return Response.json({ ok: false, error: "not_eligible_for_email_retry" }, { status: 400 });
    }

    const candidate = {
      workosUserId,
      email: record.email,
      displayName: record.display_name,
      firstName: "",
      originalSupportPeriodEnd: record.original_support_period_end,
      status: record.status,
    };
    const emailResult = await sendSupportToProMigrationEmail(ctx.admin, candidate, record.id);
    return Response.json({ ok: emailResult.ok, emailResult });
  }

  return Response.json(
    { ok: false, error: "unknown_action", message: "Use action dry_run, execute, or retry_email." },
    { status: 400 },
  );
}
