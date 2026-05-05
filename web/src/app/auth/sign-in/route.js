import { NextResponse } from "next/server";

export async function GET(request) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const remember = request.nextUrl.searchParams.get("remember") || "1";
  const loginHint = request.nextUrl.searchParams.get("loginHint") || "";
  const u = new URL("/api/auth/workos/signin", request.url);
  u.searchParams.set("returnTo", returnTo);
  u.searchParams.set("remember", remember);
  if (loginHint) u.searchParams.set("loginHint", loginHint);
  return NextResponse.redirect(u);
}
