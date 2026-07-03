/**
 * True when the OAuth callback should return JSON (Capacitor WebView fetch completion).
 * Only the explicit header — do not sniff Accept (Safari/Chrome include many MIME types).
 * @param {Request} request
 */
export function isCapacitorCallbackRequest(request) {
  return request.headers.get("x-top-callback-fetch") === "1";
}
