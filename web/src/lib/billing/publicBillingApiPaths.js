/**
 * Billing/auth probe routes that must not be blocked by AuthKit proxy redirects.
 * Used by `src/proxy.js` and smoke checks.
 */
export const PUBLIC_BILLING_API_PATHS = new Set([
  "/api/billing/capabilities",
  "/api/billing/sponsor-opportunities",
]);

export function isPublicBillingApiRequest(pathname, method = "GET") {
  const path = String(pathname || "");
  const m = String(method || "GET").toUpperCase();
  if (path === "/api/billing/webhook" && m === "POST") return true;
  if (m === "GET" && PUBLIC_BILLING_API_PATHS.has(path)) return true;
  return false;
}
