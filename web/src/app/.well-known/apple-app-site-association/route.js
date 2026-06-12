import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveAppleAppId() {
  const explicit = String(process.env.APPLE_APP_ID || "").trim();
  if (explicit) return explicit;
  const teamId = String(process.env.APPLE_TEAM_ID || "").trim();
  const bundleId = String(
    process.env.APPLE_BUNDLE_ID || "com.theoutreachproject.theoutreachproject",
  ).trim();
  if (teamId && bundleId) return `${teamId}.${bundleId}`;
  return "";
}

/**
 * Apple Universal Links association file for Capacitor deep-link auth return.
 * Set `APPLE_TEAM_ID` (and optionally `APPLE_BUNDLE_ID`) in production env.
 */
export async function GET() {
  const appID = resolveAppleAppId();
  const body = {
    applinks: {
      apps: [],
      details: appID
        ? [
            {
              appID,
              paths: [
                "/callback",
                "/callback/*",
                "/mobile-auth/callback",
                "/mobile-auth/callback/*",
                "/mobile-auth/complete",
                "/mobile-auth/complete/*",
                "/api/mobile/oauth-handoff/bridge",
                "/api/mobile/oauth-handoff/bridge/*",
              ],
            },
          ]
        : [],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
