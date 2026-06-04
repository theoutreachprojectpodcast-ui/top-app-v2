import { withAuth } from "@workos-inc/authkit-nextjs";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sessionAuthorizedForWorkOS } from "@/lib/auth/workosOrganizationScope";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProfileRowByWorkOSId, upsertProfileFromWorkOSUser } from "@/lib/profile/serverProfile";
import { ensureWorkOSOrganizationMembership } from "@/lib/auth/workosEnsureOrgMembership";

const ORG_DENIED = Object.freeze({
  ok: false,
  status: 401,
  error: "organization_not_allowed",
  message: "This session is not authorized for The Outreach Project organization.",
  user: null,
});

/**
 * @param {unknown} session
 * @returns {Promise<{ kind: "ok", user: import('@workos-inc/node').User } | { kind: "no_user" } | { kind: "org_blocked" }>}
 */
async function classifyRouteSession(session) {
  if (!session || typeof session !== "object" || !("user" in session) || !session.user) {
    return { kind: "no_user" };
  }
  const s = /** @type {{ user: import('@workos-inc/node').User, organizationId?: string, accessToken?: string }} */ (
    session
  );

  const admin = createSupabaseAdminClient();
  if (s.user?.id) {
    await ensureWorkOSOrganizationMembership(s.user.id);
  }

  let profileRow = admin && s.user?.id ? await getProfileRowByWorkOSId(admin, s.user.id) : null;
  if (!profileRow && admin && s.user?.id) {
    try {
      await upsertProfileFromWorkOSUser(admin, s.user);
      profileRow = await getProfileRowByWorkOSId(admin, s.user.id);
    } catch (e) {
      console.error("[torp] classifyRouteSession profile upsert failed:", e);
    }
  }

  if (
    sessionAuthorizedForWorkOS(
      { organizationId: s.organizationId, accessToken: s.accessToken, user: s.user },
      { email: s.user?.email, profileRow, workosUserId: s.user?.id },
    )
  ) {
    return { kind: "ok", user: s.user };
  }

  if (profileRow) {
    return { kind: "ok", user: s.user };
  }

  return { kind: "org_blocked" };
}

/**
 * Resolve WorkOS user in route handlers.
 * Tries the iron-sealed session cookie first (same path as `getWorkOSUserFromCookies` in RSC / admin layout),
 * then `withAuth()` so requests still work when `x-workos-middleware` headers are missing on a handler.
 */
export async function resolveWorkOSRouteUser() {
  if (!isWorkOSConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "authentication_not_configured",
      message: "WorkOS AuthKit is not configured on this deployment.",
      user: null,
    };
  }

  const cookieHit = await classifyRouteSession(await getWorkOSUserFromCookies());
  if (cookieHit.kind === "ok") return { ok: true, user: cookieHit.user };
  if (cookieHit.kind === "org_blocked") return { ...ORG_DENIED };

  try {
    const auth = await withAuth();
    const w = await classifyRouteSession(auth);
    if (w.kind === "ok") return { ok: true, user: w.user };
    if (w.kind === "org_blocked") return { ...ORG_DENIED };
  } catch {
    // withAuth unavailable for this request; cookie path already attempted.
  }

  return {
    ok: false,
    status: 401,
    error: "unauthorized",
    message: "No active session. Please sign in.",
    user: null,
  };
}

export function authFailureJson(result) {
  return Response.json(
    { error: result.error || "unauthorized", message: result.message || "Unauthorized." },
    { status: result.status || 401 },
  );
}
