import { requestOriginForStripeRedirects } from "@/lib/billing/stripeConfig";

/**
 * WorkOS redirect URI for mobile browser auth (must be registered in WorkOS dashboard).
 * @param {Request} [request]
 */
export function resolveWorkOSMobileRedirectUri(request) {
  const fromEnv = String(process.env.WORKOS_MOBILE_REDIRECT_URI || "").trim();
  if (fromEnv) return fromEnv;
  const origin = request ? requestOriginForStripeRedirects(request) : "";
  if (origin) return `${origin}/mobile-auth/callback`;
  return "";
}

/**
 * @param {string} returnTo safe path
 */
export function mobileAuthCompletePath(returnTo = "/") {
  const safe = String(returnTo || "/").trim() || "/";
  const params = new URLSearchParams();
  params.set("returnTo", safe);
  return `/mobile-auth/complete?${params.toString()}`;
}
