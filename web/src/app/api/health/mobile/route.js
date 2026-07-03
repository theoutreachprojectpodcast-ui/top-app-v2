import { NextResponse } from "next/server";
import { buildAuthHealth, buildMobileHealth } from "@/lib/runtime/productionHealth";

export const dynamic = "force-dynamic";

/** GET — Capacitor / TestFlight production target health (no secrets). */
export async function GET() {
  const auth = buildAuthHealth();
  const mobile = buildMobileHealth();
  const body = { ok: auth.ok && mobile.ok, auth, mobile };
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
