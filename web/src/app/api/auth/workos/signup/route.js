import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { isWorkOSConfigured } from "@/lib/auth/workosConfigured";
import { sanitizeWorkOSLoginHint } from "@/lib/auth/workosLoginHint";
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
  const remember = request.nextUrl.searchParams.get("remember");
  const prompt = remember === "0" ? "login" : undefined;
  const loginHint = sanitizeWorkOSLoginHint(request.nextUrl.searchParams.get("loginHint"));
  const url = await getSignUpUrl({ returnTo, loginHint, prompt });
  return NextResponse.redirect(url);
}
