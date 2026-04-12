import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { safeAppReturnPath } from "@/lib/billing/stripeConfig";

export async function GET(request) {
  if (!isWorkOSConfigured()) {
    return NextResponse.json(
      { error: "authentication_not_configured", message: "WorkOS AuthKit is not configured yet." },
      { status: 503 },
    );
  }
  const raw = request.nextUrl.searchParams.get("returnTo");
  const returnTo = safeAppReturnPath(raw || "/onboarding", "/onboarding");
  const url = await getSignUpUrl({ returnTo });
  return NextResponse.redirect(url);
}
