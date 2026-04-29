import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import { decodeJwt } from "jose";

/**
 * WorkOS session for Server Components / RSC where `withAuth()` throws (no `x-workos-middleware`
 * on internal render requests in Next.js 16+). Route handlers should keep using `withAuth()`.
 *
 * Mirrors AuthKit `getSessionFromCookie` (not exported from the package root).
 *
 * @returns {Promise<{ user: import('@workos-inc/node').User | null, accessToken?: string, organizationId?: string }>}
 */
export async function getWorkOSUserFromCookies() {
  const password = process.env.WORKOS_COOKIE_PASSWORD || "";
  if (password.length < 32) {
    return { user: null };
  }
  try {
    const cookieName = process.env.WORKOS_COOKIE_NAME || "wos-session";
    const jar = await cookies();
    const raw = jar.get(cookieName);
    if (!raw?.value) {
      return { user: null };
    }
    const session = await unsealData(raw.value, { password });
    if (!session?.user) {
      return { user: null };
    }
    let organizationId = "";
    if (session.accessToken) {
      try {
        const claims = decodeJwt(session.accessToken);
        organizationId = String(claims.org_id || claims.organization_id || "").trim();
      } catch {
        organizationId = "";
      }
    }
    return {
      user: session.user,
      accessToken: session.accessToken,
      ...(organizationId ? { organizationId } : {}),
    };
  } catch {
    return { user: null };
  }
}
