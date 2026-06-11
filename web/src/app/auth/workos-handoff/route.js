import { workOSAuthBridgePost } from "@/lib/auth/workosBridgeHandler";

/**
 * POST — mint PKCE cookie + 200 HTML bridge to WorkOS.
 * Must NOT live under `/api/*` — Capacitor WKWebView crashes on form navigation to API routes.
 */
export async function POST(request) {
  return workOSAuthBridgePost(request);
}
