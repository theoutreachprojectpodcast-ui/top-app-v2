import { signOut } from "@workos-inc/authkit-nextjs";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { clearAdminEmailSessionCookie } from "@/lib/auth/adminEmailSession";
import { NextResponse } from "next/server";

export async function GET(request) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  if (!isWorkOSConfigured()) {
    const res = NextResponse.redirect(new URL(returnTo, request.url));
    clearAdminEmailSessionCookie(res);
    return res;
  }
  const res = await signOut({ returnTo });
  if (res?.cookies) clearAdminEmailSessionCookie(res);
  return res;
}
