import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Next.js 16+ uses the `proxy` convention (replaces `middleware`) so AuthKit can attach
 * `x-workos-middleware` / `x-workos-session` for `withAuth()` in Route Handlers.
 * Server Components that cannot rely on those headers should use `getWorkOSUserFromCookies()` instead.
 * @see https://github.com/workos/authkit-nextjs#proxy--middleware
 */
const workosProxy = isWorkOSConfigured() ? authkitProxy() : null;

export default function proxy(request) {
  if (workosProxy) return workosProxy(request);
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
