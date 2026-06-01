import { NextResponse } from "next/server";
import { clearAdminEmailSessionCookie } from "@/lib/auth/adminEmailSession";
import { resolvePostAuthReturnTarget } from "@/lib/auth/workosSafeReturn";

export async function GET(request) {
  const returnTo = resolvePostAuthReturnTarget(
    String(request.nextUrl.searchParams.get("returnTo") || "/admin-login").trim(),
    "/admin-login",
  );
  const res = NextResponse.redirect(new URL(returnTo, request.url));
  clearAdminEmailSessionCookie(res);
  return res;
}
