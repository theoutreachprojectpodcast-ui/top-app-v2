import { requirePlatformAdminRouteContext } from "@/lib/admin/adminRouteContext";
import { getBuildIdentity } from "@/lib/runtime/buildIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff-only build / release identity for cross-browser verification.
 * Does not expose secrets or infrastructure credentials.
 */
export async function GET() {
  const ctx = await requirePlatformAdminRouteContext();
  if (!ctx.ok) return ctx.response;

  const build = getBuildIdentity();
  return Response.json(
    {
      ok: true,
      build,
      canonicalOrigin: "https://theoutreachproject.app",
      vercelProject: "the-outreach-project-app",
      notes: [
        "Compare commitSha across browsers to confirm the same production release.",
        "Capacitor WebViews load the production apex URL; native store builds may lag until a new mobile release.",
      ],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
