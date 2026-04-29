import { resolveWorkOSRouteUser } from "@/lib/auth/workosRouteAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";

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
