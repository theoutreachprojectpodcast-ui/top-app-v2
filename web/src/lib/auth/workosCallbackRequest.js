/**
 * True when the OAuth callback should return JSON (Capacitor WebView fetch completion).
 * @param {Request} request
 */
export function isCapacitorCallbackRequest(request) {
  if (request.headers.get("x-top-callback-fetch") === "1") return true;
  const accept = String(request.headers.get("accept") || "").toLowerCase();
  return accept.includes("application/json");
}
