/**
 * Server-only: WorkOS AuthKit is fully configured (safe to call getSignInUrl, handleAuth, authkitProxy, etc.).
 */

/** @returns {string[]} Env var names (or short notes) still needed for hosted AuthKit sign-in / session. */
export function workOSEnvironmentIssues() {
  const issues = [];
  if (!String(process.env.WORKOS_API_KEY || "").trim()) issues.push("WORKOS_API_KEY");
  if (!String(process.env.WORKOS_CLIENT_ID || "").trim()) issues.push("WORKOS_CLIENT_ID");
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD || "";
  if (cookiePassword.length < 32) {
    issues.push("WORKOS_COOKIE_PASSWORD (min 32 characters)");
  }
  if (!String(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI || "").trim()) {
    issues.push("NEXT_PUBLIC_WORKOS_REDIRECT_URI");
  }
  return issues;
}

export function isWorkOSConfigured() {
  return workOSEnvironmentIssues().length === 0;
}
