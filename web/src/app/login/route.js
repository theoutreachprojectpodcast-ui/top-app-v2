import { NextResponse } from "next/server";

/** Common WorkOS “sign-in endpoint” alias → hosted AuthKit flow. */
export async function GET(request) {
  const dest = new URL("/auth/sign-in", request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    dest.searchParams.set(key, value);
  });
  return NextResponse.redirect(dest);
}
