import { withAuth } from "@workos-inc/authkit-nextjs";
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
  const auth = await withAuth();
  if (!auth.user) {
    return { ok: false, response: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, response: Response.json({ error: "server_storage_unavailable" }, { status: 503 }) };
  }
  const profileRow = await getProfileRowByWorkOSId(admin, auth.user.id);
  if (
    !isPlatformAdminServer({
      email: auth.user.email,
      workosUserId: auth.user.id,
      profileRow,
    })
  ) {
    return { ok: false, response: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, user: auth.user, admin, profileRow };
}
