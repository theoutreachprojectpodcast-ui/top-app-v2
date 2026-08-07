import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { authFailureJson, resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateBusinessCode } from "@/lib/bulkLicensing/businessCode";

export async function GET(request) {
  const guard = guardMutation(request, {
    rateKey: "bulk-licensing-code-check",
    limit: 60,
    skipOriginCheck: true,
  });
  if (!guard.ok) return guardFailureResponse(guard);

  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) return authFailureJson(auth);

  const codeRaw = new URL(request.url).searchParams.get("code") || "";
  const validated = validateBusinessCode(codeRaw);
  if (!validated.ok) {
    return Response.json({ available: false, error: validated.error, message: validated.message });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json({ error: "server_storage_unavailable" }, { status: 503 });
  }

  const { data } = await admin
    .from("bulk_organizations")
    .select("id")
    .eq("business_code", validated.code)
    .maybeSingle();

  return Response.json({
    available: !data,
    code: validated.code,
    message: data ? "That business code is already taken." : "Business code is available.",
  });
}
