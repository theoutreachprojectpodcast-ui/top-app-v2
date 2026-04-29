import { withAuth } from "@workos-inc/authkit-nextjs";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sessionMatchesExpectedWorkOSOrganization } from "@/lib/auth/workosOrganizationScope";

/**
 * Resolve WorkOS user in route handlers with a cookie fallback when
 * authkit middleware headers are unavailable on a request.
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
  try {
    const auth = await withAuth();
    if (auth?.user) {
      if (
        !sessionMatchesExpectedWorkOSOrganization({
          organizationId: auth.organizationId,
          accessToken: auth.accessToken,
        })
      ) {
        return {
          ok: false,
          status: 401,
          error: "organization_not_allowed",
          message: "This session is not authorized for The Outreach Project organization.",
          user: null,
        };
      }
      return { ok: true, user: auth.user };
    }
  } catch {
    // Fall through to cookie session parsing.
  }
  const cookieSession = await getWorkOSUserFromCookies();
  if (cookieSession?.user) {
    if (
      !sessionMatchesExpectedWorkOSOrganization({
        organizationId: cookieSession.organizationId,
        accessToken: cookieSession.accessToken,
      })
    ) {
      return {
        ok: false,
        status: 401,
        error: "organization_not_allowed",
        message: "This session is not authorized for The Outreach Project organization.",
        user: null,
      };
    }
    return { ok: true, user: cookieSession.user };
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
