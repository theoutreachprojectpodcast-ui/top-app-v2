import { NextResponse } from "next/server";
import { buildFullProductionHealth } from "@/lib/runtime/productionHealth";

export const dynamic = "force-dynamic";

/**
 * GET — aggregate production health (auth + db + env + mobile).
 * Sub-routes: /api/health/auth, /db, /env, /mobile
 */
export async function GET() {
  const body = await buildFullProductionHealth();
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
