import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { bulkAssignSchema } from "@/lib/security/schemas/bulkLicensingSchemas";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOrgAccess } from "@/lib/bulkLicensing/authorization";
import { assignLicensesByEmail, cancelLicenseAssignment } from "@/lib/bulkLicensing/assign";
import { parseEmailCsv } from "@/lib/bulkLicensing/csv";
import { revokeBulkLicense } from "@/lib/bulkLicensing/redeem";

export const runtime = "nodejs";

export async function POST(request, context) {
  const guard = guardMutation(request, { rateKey: "bulk-licensing-assign", limit: 30 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const params = await context.params;
  const organizationId = String(params?.orgId || "").trim();
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const access = await requireOrgAccess(admin, organizationId, auth.user.id, {
    requireLicenses: true,
  });
  if (!access.ok) {
    return Response.json({ error: access.error, message: access.message }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  let emails = [];
  /** @type {Array<{ row: number, message: string }>} */
  let csvErrors = [];
  /** @type {string[]} */
  let duplicates = [];

  if (contentType.includes("text/csv") || contentType.includes("multipart/form-data")) {
    let text = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (file && typeof file === "object" && "text" in file) {
        text = await /** @type {File} */ (file).text();
      }
    } else {
      text = await request.text();
    }
    const parsed = parseEmailCsv(text);
    emails = parsed.emails;
    csvErrors = parsed.errors;
    duplicates = parsed.duplicates;
  } else {
    const parsed = await parseJsonBody(request, bulkAssignSchema);
    if (!parsed.ok) return validationFailureResponse(parsed);
    emails = parsed.data.emails;
  }

  if (!emails.length) {
    return Response.json(
      {
        error: "no_emails",
        message: "No valid emails to assign.",
        csvErrors,
        duplicates,
      },
      { status: 400 },
    );
  }

  const result = await assignLicensesByEmail(admin, {
    organizationId,
    emails,
    actorUserId: auth.user.id,
  });

  if (!result.ok) {
    return Response.json(
      { ...result, csvErrors, duplicates },
      { status: 400 },
    );
  }

  return Response.json({
    ok: true,
    assigned: result.assigned.map((a) => ({ email: a.email, licenseId: a.licenseId })),
    csvErrors,
    duplicates,
  });
}

export async function DELETE(request, context) {
  const guard = guardMutation(request, { rateKey: "bulk-licensing-unassign", limit: 40 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const params = await context.params;
  const organizationId = String(params?.orgId || "").trim();
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const access = await requireOrgAccess(admin, organizationId, auth.user.id, {
    requireLicenses: true,
  });
  if (!access.ok) {
    return Response.json({ error: access.error, message: access.message }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const licenseId = String(body.licenseId || "").trim();
  const action = String(body.action || "cancel_assignment").trim();

  if (!licenseId) {
    return Response.json({ error: "license_id_required" }, { status: 400 });
  }

  if (action === "revoke") {
    const result = await revokeBulkLicense(admin, {
      licenseId,
      actorUserId: auth.user.id,
      actorType: "user",
      reason: String(body.reason || "revoked_by_org_admin"),
    });
    if (!result.ok) {
      return Response.json(result, { status: 400 });
    }
    return Response.json({ ok: true, revoked: true });
  }

  const result = await cancelLicenseAssignment(admin, {
    licenseId,
    organizationId,
    actorUserId: auth.user.id,
  });
  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }
  return Response.json({ ok: true });
}
