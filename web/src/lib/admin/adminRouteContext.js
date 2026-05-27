import { resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";
import { guardMutation, guardFailureResponse } from "@/lib/security/secureRoute";

/**
 * @returns {Promise<
 *   | { ok: true, user: import('@workos-inc/node').User, admin: import('@supabase/supabase-js').SupabaseClient, profileRow: Record<string, unknown> | null }
 *   | { ok: false, response: Response }
 * >}
 */
export async function requirePlatformAdminRouteContext() {
  const auth = await resolveWorkOSRouteUser();
  if (!auth.ok) {
    return { ok: false, response: Response.json({ error: auth.error, message: auth.message }, { status: auth.status }) };
  }
  const user = auth.user;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, response: Response.json({ error: "server_storage_unavailable" }, { status: 503 }) };
  }
  const profileRow = await getProfileRowByWorkOSId(admin, user.id);
  // Match `app/admin/layout.js`: console access is `isPlatformAdminServer` only.
  // Bootstrap-approved emails may not yet have `platform_role` / `admin:access` on the profile row;
  // requiring `canAccessAdmin` here caused 403 on admin APIs (e.g. QA status) while pages still loaded.
  if (
    !isPlatformAdminServer({
      email: user.email,
      workosUserId: user.id,
      profileRow,
    })
  ) {
    return { ok: false, response: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, user, admin, profileRow };
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
