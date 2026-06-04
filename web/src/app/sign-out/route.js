import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { clearAdminEmailSessionCookie } from "@/lib/auth/adminEmailSession";
import { buildWorkOSSignOutResponse } from "@/lib/auth/workosSignOutRoute";
import { appPublicHref } from "@/lib/runtime/deploymentHosts";
import { safeWorkOSReturnTarget } from "@/lib/auth/workosSafeReturn";
import { NextResponse } from "next/server";

export async function GET(request) {
  const rawReturnTo = request.nextUrl.searchParams.get("returnTo") || "/";

  if (!isWorkOSConfigured()) {
    const path = safeWorkOSReturnTarget(rawReturnTo, "/");
    const destination = path.startsWith("http") ? path : appPublicHref(path);
    const res = NextResponse.redirect(destination);
    clearAdminEmailSessionCookie(res);
    return res;
  }

  return buildWorkOSSignOutResponse(rawReturnTo);
}
