import {
  guardMutation,
  guardFailureResponse,
  parseJsonBody,
  validationFailureResponse,
} from "@/lib/security/secureRoute";
import { bulkRedeemSchema } from "@/lib/security/schemas/bulkLicensingSchemas";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  redeemBulkLicense,
  redeemBulkLicenseByInvitation,
} from "@/lib/bulkLicensing/redeem";
import {
  sendBulkRedemptionConfirmationEmail,
} from "@/lib/bulkLicensing/emails";

export const runtime = "nodejs";

export async function POST(request) {
  const guard = guardMutation(request, { rateKey: "bulk-licensing-redeem", limit: 20 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const parsed = await parseJsonBody(request, bulkRedeemSchema);
  if (!parsed.ok) return validationFailureResponse(parsed);

  const email = String(auth.user.email || "").trim().toLowerCase();
  let result;
  if (parsed.data.inviteToken) {
    result = await redeemBulkLicenseByInvitation(admin, {
      inviteToken: parsed.data.inviteToken,
      workosUserId: auth.user.id,
      email,
    });
  } else if (parsed.data.licenseCode) {
    result = await redeemBulkLicense(admin, {
      redeemToken: parsed.data.licenseCode,
      workosUserId: auth.user.id,
      email,
    });
  } else {
    return Response.json(
      { error: "missing_code", message: "Provide a license code or invitation token." },
      { status: 400 },
    );
  }

  if (!result.ok) {
    return Response.json(
      { error: result.error, message: result.message, warnings: result.warnings || [] },
      { status: result.error === "license_not_found" ? 404 : 400 },
    );
  }

  if (!result.alreadyRedeemed && email) {
    await sendBulkRedemptionConfirmationEmail({
      to: email,
      organizationName: result.organizationName || "your organization",
      expiresAt: result.expiresAt,
      memberEmail: email,
    });
  }

  return Response.json({
    ok: true,
    alreadyRedeemed: !!result.alreadyRedeemed,
    organizationId: result.organizationId,
    organizationName: result.organizationName,
    businessCode: result.businessCode,
    expiresAt: result.expiresAt,
    warnings: result.warnings || [],
  });
}
