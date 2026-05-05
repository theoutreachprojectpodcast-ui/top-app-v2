import { NextResponse } from "next/server";

export async function GET(request) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const u = new URL("/sign-out", request.url);
  u.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(u);
}
