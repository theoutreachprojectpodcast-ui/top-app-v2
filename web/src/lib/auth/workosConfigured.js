/**
 * Server-only: WorkOS AuthKit is fully configured (safe to call getSignInUrl, handleAuth, etc.).
 */
export function isWorkOSConfigured() {
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD || "";
  return !!(
    process.env.WORKOS_API_KEY &&
    process.env.WORKOS_CLIENT_ID &&
    cookiePassword.length >= 32 &&
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}
