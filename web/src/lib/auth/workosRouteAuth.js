import { withAuth } from "@workos-inc/authkit-nextjs";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";

const ORG_DENIED = Object.freeze({
  ok: false,
  status: 401,
  error: "organization_not_allowed",
  message: "This session is not authorized for The Outreach Project organization.",
  user: null,
});

/**
 * @param {unknown} session
 * @returns {{ kind: "ok", user: import('@workos-inc/node').User } | { kind: "no_user" } | { kind: "org_blocked" }}
 */
function classifyRouteSession(session) {
  if (!session || typeof session !== "object" || !("user" in session) || !session.user) {
    return { kind: "no_user" };
  }
  const s = /** @type {{ user: import('@workos-inc/node').User, organizationId?: string, accessToken?: string }} */ (
    session
  );
  if (
    !sessionMatchesExpectedWorkOSOrganization({
      organizationId: s.organizationId,
      accessToken: s.accessToken,
    })
  ) {
    return { kind: "org_blocked" };
  }
  return { kind: "ok", user: s.user };
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

  const cookieHit = classifyRouteSession(await getWorkOSUserFromCookies());
  if (cookieHit.kind === "ok") return { ok: true, user: cookieHit.user };
  if (cookieHit.kind === "org_blocked") return { ...ORG_DENIED };

  try {
    const auth = await withAuth();
    const w = classifyRouteSession(auth);
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
