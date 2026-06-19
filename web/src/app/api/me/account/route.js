import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { deleteUserAccount } from "@/lib/account/deleteUserAccount";
import { guardFailureResponse, guardMutation } from "@/lib/security/secureRoute";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(request) {
  const guard = guardMutation(request, { rateKey: "me-account-delete", limit: 5, windowMs: 3600000 });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  let body = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (String(body?.confirmPhrase || "").trim() !== "DELETE") {
    return Response.json(
      {
        ok: false,
        error: "confirmation_required",
        message: 'Type DELETE in the confirmation field to permanently delete your account.',
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ ok: false, error: "server_storage_unavailable" }, { status: 503 });
  }

  const result = await deleteUserAccount(admin, auth.user);
  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: result.error,
        message: result.message || "Could not delete your account. Try again or contact support.",
        warnings: result.warnings,
      },
      { status: result.status || 500 },
    );
  }

  return Response.json({
    ok: true,
    message: "Your account and personal data have been deleted.",
    signOutPath: "/sign-out?returnTo=/",
    warnings: result.warnings,
  });
}
