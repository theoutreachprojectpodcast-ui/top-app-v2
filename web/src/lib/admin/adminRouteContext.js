import { createSupabaseAdminClient, profileTableName } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";
import { resolveAdminGateSession } from "@/lib/admin/resolveAdminGateSession";

/**
 * @returns {Promise<
 *   | { ok: true, user: import('@workos-inc/node').User, admin: import('@supabase/supabase-js').SupabaseClient, profileRow: Record<string, unknown> | null }
 *   | { ok: false, response: Response }
 * >}
 */
export async function requirePlatformAdminRouteContext() {
  const gate = await resolveAdminGateSession();
  if (!gate.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: gate.error || "unauthorized", message: "Admin sign-in required." },
        { status: gate.status || 401 },
      ),
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, response: Response.json({ error: "server_storage_unavailable" }, { status: 503 }) };
  }

  let profileRow = null;
  if (gate.mode === "email") {
    const { data } = await admin.from(profileTableName()).select("*").eq("email", gate.email).maybeSingle();
    profileRow = data;
  } else {
    profileRow = await getProfileRowByWorkOSId(admin, gate.user.id);
  }

  return { ok: true, user: gate.user, admin, profileRow };
}

/**
 * Admin mutation guard: same-origin + rate limit + platform admin session.
 * @param {Request} request
 * @param {{ rateKey?: string, limit?: number, windowMs?: number }} [options]
 */
export async function requirePlatformAdminMutation(request, options = {}) {
  const { rateKey = "admin-mutation", limit = 80, windowMs = 60000 } = options;
  const guard = guardMutation(request, { rateKey, limit, windowMs });
  if (!guard.ok) {
    return { ok: false, response: guardFailureResponse(guard) };
  }
  return requirePlatformAdminRouteContext();
}
