import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { updateSession } from "@/utils/supabase/middleware";

function workosReady() {
  const pwd = process.env.WORKOS_COOKIE_PASSWORD || "";
  return !!(
    process.env.WORKOS_CLIENT_ID &&
    process.env.WORKOS_API_KEY &&
    pwd.length >= 32 &&
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}

const workosMiddleware = workosReady() ? authkitProxy() : null;

export function middleware(request) {
  if (workosMiddleware) return workosMiddleware(request);
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
