import { signOut } from "@workos-inc/authkit-nextjs";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { NextResponse } from "next/server";

export async function GET(request) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  if (!isWorkOSConfigured()) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }
  await signOut({ returnTo });
}
