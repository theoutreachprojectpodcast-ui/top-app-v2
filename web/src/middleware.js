import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { updateSession } from "@/utils/supabase/middleware";

const workosMiddleware = isWorkOSConfigured() ? authkitProxy() : null;

export function middleware(request) {
  if (workosMiddleware) return workosMiddleware(request);
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
