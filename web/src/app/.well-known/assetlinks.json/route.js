import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Android App Links verification for mobile auth deep return paths.
 */
export async function GET() {
  const packageName = String(process.env.ANDROID_PACKAGE_NAME || "org.theoutreachproject.torp").trim();
  const fingerprints = String(process.env.ANDROID_APP_LINK_SHA256 || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const body =
    fingerprints.length > 0
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
