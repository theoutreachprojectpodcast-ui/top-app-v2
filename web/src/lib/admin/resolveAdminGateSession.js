import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";
import { isAdminEmailLoginEnabled } from "@/lib/auth/adminEmailLogin";
import { adminEmailSyntheticUser, readAdminEmailSessionFromCookies } from "@/lib/auth/adminEmailSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId } from "@/lib/profile/serverProfile";
import { isPlatformAdminServer } from "@/lib/admin/platformAdminServer";

/**
 * Shared gate for `/admin` layout and admin API routes.
 *
 * @returns {Promise<
 *   | { ok: true, mode: "email" | "workos", user: import('@workos-inc/node').User, email: string }
 *   | { ok: false, status?: number, error?: string }
 * >}
 */
export async function resolveAdminGateSession() {
  if (isAdminEmailLoginEnabled()) {
    const emailSession = await readAdminEmailSessionFromCookies();
    if (emailSession?.email && isPlatformAdminServer({ email: emailSession.email })) {
      return {
        ok: true,
        mode: "email",
        user: adminEmailSyntheticUser(emailSession.email),
        email: emailSession.email,
      };
    }
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const workosAuth = await getWorkOSUserFromCookies();
  if (workosAuth.user && sessionMatchesExpectedWorkOSOrganization(workosAuth)) {
    const admin = createSupabaseAdminClient();
    const profileRow = admin ? await getProfileRowByWorkOSId(admin, workosAuth.user.id) : null;
    if (
      isPlatformAdminServer({
        email: workosAuth.user.email,
        workosUserId: workosAuth.user.id,
        profileRow,
      })
    ) {
      return {
        ok: true,
        mode: "workos",
        user: workosAuth.user,
        email: String(workosAuth.user.email || "").trim(),
      };
    }
  }

  return { ok: false, status: 401, error: "unauthorized" };
}
