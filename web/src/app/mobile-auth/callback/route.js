import { handleAuth } from "@workos-inc/authkit-nextjs";
import { requestOriginForStripeRedirects } from "@/lib/billing/stripeConfig";
import { onWorkOSSuccess } from "@/lib/auth/workosAuthSuccess";

/**
 * WorkOS AuthKit callback for mobile browser sign-in/sign-up.
 * Register `WORKOS_MOBILE_REDIRECT_URI` → `{origin}/mobile-auth/callback` in WorkOS.
 */
export async function GET(request) {
  const baseURL = requestOriginForStripeRedirects(request);
  return handleAuth({
    returnPathname: "/mobile-auth/complete",
    baseURL,
    onSuccess: onWorkOSSuccess,
  })(request);
}
