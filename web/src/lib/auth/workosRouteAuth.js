import { withAuth } from "@workos-inc/authkit-nextjs";
import { getWorkOSUserFromCookies } from "@/lib/auth/workosSessionFromCookies";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";

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
    if (auth?.user) return { ok: true, user: auth.user };
  } catch {
    // Fall through to cookie session parsing.
  }
  const cookieSession = await getWorkOSUserFromCookies();
  if (cookieSession?.user) return { ok: true, user: cookieSession.user };
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
