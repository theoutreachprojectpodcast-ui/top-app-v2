/**
 * Server-only: WorkOS AuthKit is fully configured (safe to call getSignInUrl, handleAuth, authkitProxy, etc.).
 */

/** @returns {string[]} Env var names (or short notes) still needed for hosted AuthKit sign-in / session. */
export function workOSEnvironmentIssues() {
  const issues = [];
  const apiKey = String(process.env.WORKOS_API_KEY || "").trim();
  if (!apiKey) issues.push("WORKOS_API_KEY");
  else if (!/^sk_/.test(apiKey)) issues.push("WORKOS_API_KEY (expected sk_*)");

  const clientId = String(process.env.WORKOS_CLIENT_ID || "").trim();
  if (!clientId) issues.push("WORKOS_CLIENT_ID");
  else if (!/^client_/.test(clientId)) issues.push("WORKOS_CLIENT_ID (expected client_*)");

  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD || "";
  if (cookiePassword.length < 32) {
    issues.push("WORKOS_COOKIE_PASSWORD (min 32 characters)");
  }
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").trim().toLowerCase();
  const isProdLikeHost = appUrl.startsWith("https://") && !appUrl.includes("localhost");
  const cookieDomain = String(process.env.WORKOS_COOKIE_DOMAIN || "").trim();
  if (isProdLikeHost && !cookieDomain) {
    issues.push("WORKOS_COOKIE_DOMAIN (set to theoutreachproject.app in production)");
  }
  const privateRedirect = String(process.env.WORKOS_REDIRECT_URI || "").trim();
  const publicRedirect = String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "").trim();
  if (!privateRedirect && !publicRedirect) {
    issues.push("WORKOS_REDIRECT_URI or NEXT_PUBLIC_WORKOS_REDIRECT_URI");
  }
  return issues;
}

export function isWorkOSConfigured() {
  return workOSEnvironmentIssues().length === 0;
}
