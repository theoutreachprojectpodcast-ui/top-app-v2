import { workOSGoJsonResponse, workOSGoResponse } from "@/lib/auth/workosGoRoute";

/**
 * GET — set PKCE cookie + bridge to WorkOS (HTML) or JSON `{ url }` when `format=json`.
 * Safe for Capacitor (not under `/api/*`).
 */
export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "json") {
    return workOSGoJsonResponse(url);
  }
  return workOSGoResponse(url);
}
